const { getCallSession, addTurn, createCallSession, updateCallSession } = require('../state/calls');
const { getGroqSTT, getGoogleTTS } = require('../services/speech');
const { getLLMResponse, summarizeCall } = require('../services/llm');
const { getCallMemory, saveCall, getKnowledge } = require('../services/mongodb');
const entityService = require('../services/entity');
const leadService = require('../services/lead');
const { spawn } = require('child_process');

// Audio Conversion: mulaw/PCM 8kHz chunks → PCM WAV 16kHz Buffer
function mulawToWavBuffer(mulawBase64Chunks) {
  return new Promise((resolve, reject) => {
    const inputBuffer = Buffer.concat(
      mulawBase64Chunks.map(c => Buffer.from(c, 'base64'))
    );

    const ffmpeg = spawn('ffmpeg', [
      '-f', 'mulaw',
      '-ar', '8000',
      '-ac', '1',
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', d => chunks.push(d));
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

// Audio Conversion: WAV Buffer → mulaw 8kHz buffer
function wavToMulawBuffer(wavBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ar', '8000',
      '-ac', '1',
      '-f', 'mulaw',
      '-acodec', 'pcm_mulaw',
      'pipe:1',
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', d => chunks.push(d));
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

function handleExotelStreamConnection(ws) {
  let streamSid = null;
  let callSid = null;
  let audioBuffer = [];
  let isAIProcessing = false;
  let silenceTimer = null;
  const SILENCE_THRESHOLD_MS = 800;
  let safetyUnlockTimeout = null;

  const resetAIState = (reason = '') => {
    if (reason) console.log(`[ExotelStream] Resetting AI state: ${reason}`);
    isAIProcessing = false;
    audioBuffer = [];
    if (safetyUnlockTimeout) {
      clearTimeout(safetyUnlockTimeout);
      safetyUnlockTimeout = null;
    }
  };

  ws.on('message', async (data, isBinary) => {
    // 1. Raw Binary Audio Frame (Exotel binary audio stream)
    if (isBinary || (Buffer.isBuffer(data) && !data.toString('utf8').trim().startsWith('{'))) {
      if (isAIProcessing) return;

      const payloadBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const base64Audio = payloadBuffer.toString('base64');

      // VAD heuristic for 8kHz mulaw / PCM audio
      let loudCount = 0;
      for (let i = 0; i < payloadBuffer.length; i++) {
        let val = payloadBuffer[i];
        let amp = val < 128 ? 127 - val : 255 - val;
        if (amp > 20) loudCount++;
      }

      if (loudCount > 15) {
        audioBuffer.push(base64Audio);
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          processUtterance();
        }, SILENCE_THRESHOLD_MS);
      } else if (audioBuffer.length > 0) {
        audioBuffer.push(base64Audio);
      }
      return;
    }

    // 2. JSON Event Packet (Exotel JSON streaming protocol)
    let msg;
    try {
      msg = JSON.parse(data.toString('utf8'));
    } catch (err) {
      console.warn('[ExotelStream] Non-JSON, non-binary message received:', data.toString('utf8').slice(0, 100));
      return;
    }

    const event = msg.event || msg.type;

    // Handle Stream Start / Connected
    if (event === 'start' || event === 'connected') {
      streamSid = msg.stream_sid || msg.streamSid || msg.start?.streamSid || `exotel_stream_${Date.now()}`;
      callSid = msg.call_sid || msg.callSid || msg.start?.callSid || streamSid;
      console.log(`[ExotelStream] Stream started: ${streamSid} for call: ${callSid}`);

      let session = getCallSession(callSid);
      if (!session) {
        session = createCallSession(callSid);
      }

      // FETCH MEMORY from MongoDB
      if (session.phoneNumber && session.phoneNumber !== 'unknown') {
        try {
          const memory = await getCallMemory(session.phoneNumber);
          if (memory && memory.length > 0) {
            console.log(`[ExotelStream] Loaded ${memory.length} interactions for ${session.phoneNumber}`);
            updateCallSession(callSid, { memory });
          }
        } catch (err) {
          console.error(`[ExotelStream] Error fetching memory:`, err.message);
        }
      }

      // FETCH KNOWLEDGE & INSTRUCTIONS
      try {
        const entityProfile = await entityService.getEntityByName(session.entity);
        if (entityProfile) {
          updateCallSession(callSid, { 
            entity_id: entityProfile._id,
            instructions: entityProfile.instructions || '' 
          });
        }

        const knowledge = await getKnowledge(session.entity);
        if (knowledge && knowledge.length > 0) {
          updateCallSession(callSid, { knowledge });
        }
      } catch (err) {
        console.error(`[ExotelStream] Error fetching entity data:`, err.message);
      }

    } else if (event === 'media') {
      if (isAIProcessing) return;

      const payload = msg.media?.payload || msg.payload;
      if (!payload) return;

      const payloadBuffer = Buffer.from(payload, 'base64');

      // VAD heuristic for audio
      let loudCount = 0;
      for (let i = 0; i < payloadBuffer.length; i++) {
        let val = payloadBuffer[i];
        let amp = val < 128 ? 127 - val : 255 - val;
        if (amp > 20) loudCount++;
      }

      if (loudCount > 15) {
        audioBuffer.push(payload);
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          processUtterance();
        }, SILENCE_THRESHOLD_MS);
      } else if (audioBuffer.length > 0) {
        audioBuffer.push(payload);
      }

    } else if (event === 'mark') {
      console.log(`[${callSid}] AI finished speaking, unlocking audio capture`);
      resetAIState('mark event');

    } else if (event === 'stop' || event === 'close') {
      console.log(`[ExotelStream] Stream stopped: ${streamSid}`);
      if (global.broadcastEvent) {
        global.broadcastEvent('call_ended', { callSid });
      }
      processPostCallSummary(callSid);
    }
  });

  async function processUtterance() {
    if (audioBuffer.length === 0 || isAIProcessing) return;

    isAIProcessing = true;
    const currentAudio = [...audioBuffer];
    audioBuffer = [];

    safetyUnlockTimeout = setTimeout(() => {
      resetAIState('Safety timeout reached (12s)');
    }, 12000);

    try {
      // 1. Decode audio
      const pcm16Wav = await mulawToWavBuffer(currentAudio);

      // 2. STT (Groq Whisper)
      console.log(`\n--- [${callSid}] EXOTEL AUDIO CHUNK RECEIVED ---`);
      const sttResult = await getGroqSTT(pcm16Wav);

      if (!sttResult || !sttResult.transcript || sttResult.transcript.trim() === '') {
        resetAIState('Empty STT result');
        return;
      }

      console.log(`[${callSid}] User said: ${sttResult.transcript}`);
      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'user',
        text: sttResult.transcript,
        language: sttResult.language_code || 'hi'
      });

      if (global.broadcastEvent) {
        global.broadcastEvent('transcript', {
          speaker: 'user',
          text: sttResult.transcript,
          id: Date.now()
        });
      }

      const session = getCallSession(callSid);

      // 3. LLM Processing
      const aiResponse = await getLLMResponse(
        session.turns, 
        sttResult.transcript, 
        session.memory || [],
        session.knowledge || [],
        session.instructions || ''
      );

      console.log(`[${callSid}] AI will say: "${aiResponse.spoken}" (Language: ${aiResponse.language})`);

      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'ai',
        text: aiResponse.spoken,
        intent: aiResponse.intent,
        entities: aiResponse.entities,
        sentiment: aiResponse.sentiment,
        language: aiResponse.language
      });

      if (global.broadcastEvent) {
        global.broadcastEvent('transcript', {
          speaker: 'ai',
          text: aiResponse.spoken,
          id: Date.now()
        });
      }

      // 4. TTS (Google TTS)
      const ttsBuffer = await getGoogleTTS(aiResponse.spoken, aiResponse.language);
      if (ttsBuffer) {
        const rawMulaw = await wavToMulawBuffer(ttsBuffer);

        // Chunk and stream back to Exotel (support both raw binary audio streams and JSON events)
        const chunkSize = 4000;
        for (let i = 0; i < rawMulaw.length; i += chunkSize) {
          const chunk = rawMulaw.slice(i, i + chunkSize);
          // 1. Raw binary chunk
          try { ws.send(chunk); } catch {}
          // 2. JSON media chunk
          try {
            ws.send(JSON.stringify({
              event: 'media',
              stream_sid: streamSid,
              streamSid: streamSid,
              media: {
                payload: chunk.toString('base64')
              }
            }));
          } catch {}
        }

        // Send Mark event to unlock
        try {
          ws.send(JSON.stringify({
            event: 'mark',
            stream_sid: streamSid,
            streamSid: streamSid,
            mark: { name: 'ai_done' }
          }));
        } catch {}
      } else {
        resetAIState('TTS result empty');
      }

    } catch (e) {
      console.error(`[${callSid}] Error in Exotel audio pipeline:`, e);
      resetAIState('Catch block error');
    }
  }
}

async function processPostCallSummary(callSid) {
  const session = getCallSession(callSid);
  if (!session || session.turns.length === 0) return;

  console.log(`[${callSid}] Generating post-call summary for Exotel call...`);
  const summary = await summarizeCall(session.turns);

  if (summary) {
    updateCallSession(callSid, {
      summary: summary,
      resolution_status: summary.resolution || 'pending'
    });

    const callData = {
      phone: session.phoneNumber,
      entity_id: session.entity_id,
      transcript: session.turns,
      summary: summary.summary,
      intent: summary.key_intent,
      resolution: summary.resolution,
      meta: summary.important_details
    };

    try {
      await saveCall(callData);
      const positiveIntents = ['interest', 'admission', 'sales', 'positive', 'high_interest'];
      if (positiveIntents.includes(summary.key_intent?.toLowerCase()) || summary.resolution === 'resolved') {
        await leadService.createLead({
          phone: session.phoneNumber,
          name: 'Anonymous Caller',
          interest: summary.key_intent,
          entity_id: session.entity_id,
          meta: summary.important_details
        });
      }
    } catch (err) {
      console.error(`[MongoDB] Error saving Exotel call record:`, err.message);
    }
  }
}

module.exports = {
  handleExotelStreamConnection
};
