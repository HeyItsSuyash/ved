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

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure permissive CORS for the frontend deployed on Vercel
const corsOptions = {
  origin: '*', // Better to specify exact origin in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

const { initiateOutboundCall } = require("./twilio/outbound");
const { handleTwilioWebhook } = require("./twilio/webhook");
const { handleStreamConnection } = require("./twilio/stream");
const { getCallSession, getAllCalls, updateCallSession } = require("./state/calls");
const { getAllAnalytics, getKnowledge, addKnowledge, deleteKnowledge } = require("./services/mongodb");
const authRoutes = require('./routes/auth');
const entityRoutes = require('./routes/entities');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const widgetRoutes = require('./routes/widget');

app.use("/auth", authRoutes);
app.use('/entities', entityRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/api/widget', widgetRoutes);

// Demo Page for Integration Testing
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../integration/html/example.html'));
});

// Serve Widget Static Files
app.use('/widget', express.static(path.join(__dirname, '../integration/widget')));
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../integration/widget/widget.js'));
});

app.get(["/", "/health"], (req, res) => {
  res.status(200).send("OK");
});

const { handleExotelVoiceWebhook, handleExotelStatusCallback } = require("./exotel/webhook");
const { handleExotelStreamConnection } = require("./exotel/stream");

// Call Initiation & Voice Webhook
app.post("/call/outbound", initiateOutboundCall);
app.post("/twilio/outbound", initiateOutboundCall);
app.post("/twilio/voice", handleTwilioWebhook);

// Exotel Voice Webhooks
app.all("/exotel/voice", handleExotelVoiceWebhook);
app.all("/exotel/status", handleExotelStatusCallback);

// Telephony Status & Provider Check
app.get("/api/telephony/status", (req, res) => {
  const provider = (process.env.TELEPHONY_PROVIDER || 'twilio').toLowerCase();
  res.json({
    provider,
    exotelConfigured: Boolean(process.env.EXOTEL_ACCOUNT_SID && process.env.EXOTEL_API_KEY),
    twilioConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  });
});

// Dashboard APIs
app.get("/calls", (req, res) => {
  res.json(getAllCalls());
});

app.get("/call/:sid/status", (req, res) => {
  const session = getCallSession(req.params.sid);
  if (!session) return res.status(404).json({ error: "Call not found" });
  res.json(session);
});

app.get("/call/:sid/summary", (req, res) => {
  const session = getCallSession(req.params.sid);
  if (!session) return res.status(404).json({ error: "Call not found" });
  res.json({ summary: session.summary, resolution_status: session.resolution_status });
});

// Hangup endpoint: terminates an active Twilio call via Twilio REST API
app.post("/call/:sid/hangup", async (req, res) => {
  const { sid } = req.params;
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    await client.calls(sid).update({ status: 'completed' });
    console.log(`[Hangup] Call ${sid} terminated by frontend request`);
    res.json({ success: true, callSid: sid });
  } catch (err) {
    console.error(`[Hangup] Error terminating call ${sid}:`, err.message);
    res.status(500).json({ error: 'Failed to terminate call', details: err.message });
  }
});

// Mute endpoint: tracks mute state in call session
// Note: True audio muting for direct Twilio calls requires Conference participant API.
// For this architecture the AI stream processes audio server-side; mute state is stored
// in session so stream.js can optionally check it before processing utterances.
app.post("/call/:sid/mute", (req, res) => {
  const { sid } = req.params;
  const { muted } = req.body;
  const session = getCallSession(sid);
  if (!session) {
    return res.status(404).json({ error: 'Call session not found' });
  }
  updateCallSession(sid, { muted: Boolean(muted) });
  console.log(`[Mute] Call ${sid} muted=${muted}`);
  res.json({ success: true, callSid: sid, muted: Boolean(muted) });
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

app.delete("/knowledge/:id", async (req, res) => {
  const success = await deleteKnowledge(req.params.id);
  res.json({ success });
});

// ==========================================
// VED (Unified Voice System) API Endpoints
// ==========================================
const { 
  getNumbersPool, 
  addNumber, 
  removeNumber, 
  updateFallbackOrder, 
  getVedPrompt, 
  setVedPrompt 
} = require("./state/ved");

// 1. VED Operations: Numbers Pool & Fallback Order
app.get("/api/ved/numbers", (req, res) => {
  res.json({ numbers: getNumbersPool() });
});

app.post("/api/ved/numbers", (req, res) => {
  try {
    const { number, label } = req.body;
    const added = addNumber({ number, label });
    res.json({ success: true, number: added, numbers: getNumbersPool() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/ved/numbers/:number", (req, res) => {
  try {
    const { number } = req.params;
    removeNumber(decodeURIComponent(number));
    res.json({ success: true, numbers: getNumbersPool() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/ved/numbers/order", (req, res) => {
  try {
    const { orderedNumbers } = req.body;
    const updated = updateFallbackOrder(orderedNumbers);
    res.json({ success: true, numbers: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. VED Operations: System Prompt
app.get("/api/ved/prompt", (req, res) => {
  res.json({ prompt: getVedPrompt() });
});

app.post("/api/ved/prompt", (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Valid prompt string required" });
  }
  const updated = setVedPrompt(prompt);
  res.json({ success: true, prompt: updated });
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

    const liveSessions = getAllCalls();
    const allRecords = [...liveSessions, ...(Array.isArray(dbCalls) ? dbCalls : [])];
    const totalCalls = allRecords.length;

    let totalSeconds = 0;
    allRecords.forEach(c => {
      if (c.callData && c.callData.duration) {
        totalSeconds += parseInt(c.callData.duration, 10) || 0;
      } else if (c.turns && c.turns.length > 0) {
        totalSeconds += c.turns.length * 10;
      }
    });

    const avgSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
    const formatDuration = (sec) => {
      if (!sec || sec === 0) return '0s';
      const mins = Math.floor(sec / 60);
      const remainingSec = sec % 60;
      return mins > 0 ? `${mins}m ${remainingSec}s` : `${remainingSec}s`;
    };

    // Calculate outcomes from actual sessions
    const outcomes = {
      resolved: allRecords.filter(c => c.resolution_status === 'resolved' || c.resolution === 'resolved').length,
      in_progress: liveSessions.length,
      follow_up_needed: allRecords.filter(c => c.resolution_status === 'follow_up_needed' || c.resolution === 'follow_up_needed').length,
      escalated: allRecords.filter(c => c.resolution_status === 'escalated' || c.resolution === 'escalated').length
    };

    const successRate = totalCalls > 0 ? Math.round((outcomes.resolved / totalCalls) * 100) : 0;

    // Extract real questions asked in conversations
    const faqs = [];
    const questionMap = new Map();
    allRecords.forEach(c => {
      if (Array.isArray(c.turns)) {
        c.turns.filter(t => t.speaker === 'user').forEach(t => {
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

    const trends = [
      { date: "Mon", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Tue", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Wed", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Thu", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Fri", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Sat", calls: 0, talkTimeMins: 0, successRate: 0 },
      { date: "Today", calls: totalCalls, talkTimeMins: Math.round(totalSeconds / 60), successRate }
    ];

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
      successRate,
      trends,
      activeLines: getNumbersPool().filter(n => n.status === 'Active').length,
      totalLines: getNumbersPool().length
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

  if (normalizedPath === "/twilio/stream" || normalizedPath.startsWith("/twilio/stream/")) {
    handleStreamConnection(ws);
  } else if (normalizedPath === "/exotel/stream" || normalizedPath.startsWith("/exotel/stream/")) {
    handleExotelStreamConnection(ws, req);
  } else if (normalizedPath === "/live" || normalizedPath === "/live/") {
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server fully operational on port ${PORT}`);
  console.log(`- Local access: http://localhost:${PORT}`);
  console.log(`- Network access: http://127.0.0.1:${PORT}`);
  console.log(`- Public SERVER_URL: ${process.env.SERVER_URL || 'not set'}`);
});
// Active tunnel reload: faq-exemption-termination-proposed