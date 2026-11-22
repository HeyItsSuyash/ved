const fs = require('fs');
require("dotenv").config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });
const { execSync } = require('child_process');

try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  console.log('[startup] ffmpeg found');
} catch {
  console.error('[startup] ffmpeg NOT found — audio pipeline will fail. Install ffmpeg.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('[startup] JWT_SECRET is not set. Refusing to start: sign-in tokens would be forgeable.');
  process.exit(1);
}

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DASHBOARD_ORIGIN restricts browser access to the dashboard's origin(s), comma-separated.
const allowedOrigins = (process.env.DASHBOARD_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const { handleTwilioWebhook } = require("./twilio/webhook");
const { handleStreamConnection } = require("./twilio/stream");
const { getCallSession, getAllCalls, updateCallSession } = require("./state/calls");
const { getAllAnalytics, getKnowledge, addKnowledge, updateKnowledge, deleteKnowledge } = require("./services/mongodb");
const authRoutes = require('./routes/auth');
const entityRoutes = require('./routes/entities');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const { authenticate } = require('./middleware/auth');
const settingsRoutes = require('./routes/settings');
const plivoWebhooks = require('./telephony/plivo/webhooks');
const { handlePlivoStream } = require('./telephony/plivo/stream');
const { loadSettings } = require('./services/settings');
const jwt = require('jsonwebtoken');

app.use("/auth", authRoutes);

// Telephony webhooks authenticate with the provider's signature, not a user token.
app.use('/plivo', plivoWebhooks);

// Everything the dashboard uses requires a signed-in user.
app.use(['/calls', '/call', '/analytics', '/knowledge', '/api'], authenticate);
app.use('/api', settingsRoutes);
app.use('/entities', entityRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);

app.get(["/", "/health"], (req, res) => {
  res.status(200).send("OK");
});

const { handleExotelVoiceWebhook, handleExotelStatusCallback } = require("./exotel/webhook");
const { handleExotelStreamConnection } = require("./exotel/stream");

// Legacy inbound webhooks (removed once Plivo is live)
app.post("/twilio/voice", handleTwilioWebhook);

// Exotel Voice Webhooks
app.all("/exotel/voice", handleExotelVoiceWebhook);
app.all("/exotel/status", handleExotelStatusCallback);

// Dashboard APIs
app.get("/calls", (req, res) => {
  res.json(getAllCalls());
});

// Hang up a live call from the dashboard.
app.post("/call/:sid/hangup", async (req, res) => {
  const { sid } = req.params;
  const session = getCallSession(sid);
  try {
    if (session?.provider === 'plivo') {
      await require('./telephony/plivo/config').plivoClient().calls.hangup(sid);
    } else {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return res.status(400).json({ error: 'Hang-up is not supported for this call' });
      }
      const twilio = require('twilio');
      await twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN).calls(sid).update({ status: 'completed' });
    }
    res.json({ success: true, callSid: sid });
  } catch (err) {
    console.error(`[Hangup] Error terminating call ${sid}:`, err.message);
    res.status(500).json({ error: 'Failed to hang up', details: err.message });
  }
});

app.get("/analytics", async (req, res) => {
  try {
    const data = await getAllAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Knowledge Base APIs
app.get("/knowledge", async (req, res) => {
  const { entity } = req.query;
  const data = await getKnowledge(entity);
  res.json(data);
});

app.post("/knowledge/text", async (req, res) => {
  const { title, content, entity } = req.body;
  const result = await addKnowledge({ title, content, entity, type: 'TEXT' });
  res.json(result);
});

// File upload support for documents: PDF, CSV, TXT, JSON, Markdown
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { parse: parseCsv } = require('csv-parse/sync');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

app.post("/knowledge/upload", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const entity = req.body.entity || 'VED';
    const originalName = file.originalname || 'uploaded-document';
    const title = (req.body.title && req.body.title.trim()) ? req.body.title.trim() : originalName;
    const ext = path.extname(originalName).toLowerCase();

    let extractedText = '';
    let docType = 'FILE';

    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      docType = 'PDF';
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text ? pdfData.text.trim() : '';
    } else if (ext === '.csv' || file.mimetype === 'text/csv') {
      docType = 'CSV';
      const csvContent = file.buffer.toString('utf-8');
      const records = parseCsv(csvContent, {
        skip_empty_lines: true,
        trim: true
      });
      // Convert CSV rows to structured readable text for LLM grounding
      if (records.length > 0) {
        const headers = records[0];
        const rows = records.slice(1);
        extractedText = `CSV Document: ${originalName}\nHeaders: ${headers.join(', ')}\n\n` +
          rows.map((row, idx) => {
            const rowStr = headers.map((h, i) => `${h}: ${row[i] !== undefined ? row[i] : ''}`).join(' | ');
            return `Record ${idx + 1}: ${rowStr}`;
          }).join('\n');
      } else {
        extractedText = csvContent;
      }
    } else if (ext === '.json' || file.mimetype === 'application/json') {
      docType = 'JSON';
      const rawJson = file.buffer.toString('utf-8');
      try {
        const parsed = JSON.parse(rawJson);
        extractedText = JSON.stringify(parsed, null, 2);
      } catch {
        extractedText = rawJson;
      }
    } else {
      // Default treat as plain text / markdown
      docType = ext === '.md' ? 'MARKDOWN' : 'TEXT';
      extractedText = file.buffer.toString('utf-8').trim();
    }

    if (!extractedText) {
      return res.status(400).json({ error: "Unable to extract readable text from the uploaded file" });
    }

    const result = await addKnowledge({
      title,
      content: extractedText,
      entity,
      type: docType
    });

    res.json({
      success: true,
      document: result,
      extractedLength: extractedText.length,
      type: docType
    });
  } catch (err) {
    console.error('[Knowledge Upload Error]:', err);
    res.status(500).json({ error: 'Failed to process and save file', details: err.message });
  }
});

app.put("/knowledge/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const updated = await updateKnowledge(req.params.id, { title, content });
    if (!updated) {
      return res.status(404).json({ error: "Document not found or update failed" });
    }
    res.json({ success: true, document: updated });
  } catch (err) {
    console.error('[Knowledge Update Error]:', err);
    res.status(500).json({ error: "Failed to update document", details: err.message });
  }
});

app.delete("/knowledge/:id", async (req, res) => {
  const success = await deleteKnowledge(req.params.id);
  res.json({ success });
});

// 3. VED Insights: Aggregated analytics, distinct questions, outcomes, talk time & FAQs
app.get("/api/ved/insights", async (req, res) => {
  try {
    let dbCalls = [];
    try {
      dbCalls = await getAllAnalytics();
    } catch (e) {
      dbCalls = [];
    }

    // Ended calls are already saved to the database, so only count live sessions still in progress.
    const liveSessions = getAllCalls().filter(c => !c.endTime);
    const allRecords = [...liveSessions, ...(Array.isArray(dbCalls) ? dbCalls : [])];
    const totalCalls = allRecords.length;

    // Duration is only known for calls saved with start and end times.
    let totalSeconds = 0;
    let timedCalls = 0;
    allRecords.forEach(c => {
      const start = c.callData?.startTime || c.startTime;
      const end = c.callData?.endTime || c.endTime;
      if (!start || !end) return;
      const secs = (new Date(end) - new Date(start)) / 1000;
      if (Number.isFinite(secs) && secs >= 0) {
        totalSeconds += Math.round(secs);
        timedCalls += 1;
      }
    });

    const avgSeconds = timedCalls > 0 ? Math.round(totalSeconds / timedCalls) : 0;
    const formatDuration = (sec) => {
      if (!sec || sec === 0) return '0s';
      const mins = Math.floor(sec / 60);
      const remainingSec = sec % 60;
      return mins > 0 ? `${mins}m ${remainingSec}s` : `${remainingSec}s`;
    };

    // Calculate outcomes from actual sessions
    const outcomeOf = (c) => c.resolution_status || c.callData?.resolution || c.resolution;
    const outcomes = {
      resolved: allRecords.filter(c => outcomeOf(c) === 'resolved').length,
      unresolved: allRecords.filter(c => outcomeOf(c) === 'unresolved').length,
      in_progress: liveSessions.length,
      follow_up_needed: allRecords.filter(c => outcomeOf(c) === 'follow_up_needed').length,
      escalated: allRecords.filter(c => outcomeOf(c) === 'escalated').length
    };

    const successRate = totalCalls > 0 ? Math.round((outcomes.resolved / totalCalls) * 100) : 0;

    // Extract real questions asked in conversations
    const faqs = [];
    const questionMap = new Map();
    allRecords.forEach(c => {
      const turns = Array.isArray(c.turns) ? c.turns : c.callData?.transcript;
      if (Array.isArray(turns)) {
        turns.filter(t => t.speaker === 'user').forEach(t => {
          const q = t.text?.trim();
          if (q && q.length > 5) {
            questionMap.set(q, (questionMap.get(q) || 0) + 1);
          }
        });
      }
    });

    questionMap.forEach((count, question) => {
      faqs.push({ question, count, category: 'Inbound Audio Query', sentiment: 'neutral' });
    });
    faqs.sort((a, b) => b.count - a.count);

    res.json({
      totalCalls,
      totalTalkTime: formatDuration(totalSeconds),
      totalSeconds,
      avgTalkTime: formatDuration(avgSeconds),
      avgSeconds,
      distinctQuestionsCount: faqs.length,
      distinctQuestions: faqs.map(f => f.question),
      faqs: faqs.slice(0, 10),
      outcomes,
      successRate
    });
  } catch (err) {
    console.error('[VED Insights] Error generating insights:', err.message);
    res.status(500).json({ error: "Failed to generate VED insights" });
  }
});
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Array to hold connected frontend clients
const frontendClients = new Set();

// A simple helper to broadcast events to all frontend clients
function broadcastEvent(event, data) {
  const message = JSON.stringify({ event, data });
  console.log(`[Broadcast] Sending '${event}' to ${frontendClients.size} clients`);
  for (const client of frontendClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Attach broadcast helper to global so stream.js can use it easily without circular deps
global.broadcastEvent = broadcastEvent;

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  // Robust path detection: remove query params and double slashes
  const rawPath = (req.url || "").split('?')[0];
  const normalizedPath = rawPath.replace(/\/+/g, '/');

  console.log(`[WebSocket] Connection request path: ${normalizedPath} (raw: ${rawPath}) | Origin: ${req.headers.origin}`);

  if (normalizedPath.startsWith("/plivo/stream/")) {
    handlePlivoStream(ws, req);
  } else if (normalizedPath === "/twilio/stream" || normalizedPath.startsWith("/twilio/stream/")) {
    handleStreamConnection(ws);
  } else if (normalizedPath === "/exotel/stream" || normalizedPath.startsWith("/exotel/stream/")) {
    handleExotelStreamConnection(ws, req);
  } else if (normalizedPath === "/live" || normalizedPath === "/live/") {
    // Browsers cannot set headers on a WebSocket, so the dashboard sends its token in the query.
    const token = new URL(req.url, 'http://local').searchParams.get('token');
    try {
      jwt.verify(token || '', process.env.JWT_SECRET);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }
    console.log("[WebSocket] Frontend dashboard connected for updates");
    frontendClients.add(ws);
    ws.on("close", () => frontendClients.delete(ws));
  } else {
    console.log(`[WebSocket] Dropping unknown connection path: ${normalizedPath}`);
    ws.close();
  }
});

// FINAL CATCH-ALL: Ensure any unhandled routes return JSON 404, not HTML
app.use((req, res) => {
  console.warn(`[Routing] 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Resource not found",
    path: req.url,
    method: req.method
  });
});

const PORT = process.env.PORT || 3001;
require('./services/bootstrap').ensureAdmin().then(loadSettings).then((settings) => {
  // Pre-synthesize the greeting so callers hear it at once.
  const { warmUp } = require('./pipeline/tts');
  warmUp(require('./services/settings').spokenLines(settings));
  require('./telephony/plivo/lines').warmLines();
}).then(() => server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server fully operational on port ${PORT}`);
  console.log(`- Local access: http://localhost:${PORT}`);
  console.log(`- Network access: http://127.0.0.1:${PORT}`);
  console.log(`- Public URL: ${process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || 'not set'}`);
}));
