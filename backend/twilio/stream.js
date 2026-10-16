const { getCallSession, addTurn, createCallSession, updateCallSession } = require('../state/calls');
const { getGroqSTT, getGoogleTTS } = require('../services/speech');
const { getLLMResponse, summarizeCall } = require('../services/llm');
const { getCallMemory, saveCall, getKnowledge } = require('../services/mongodb');
const entityService = require('../services/entity');
const leadService = require('../services/lead');
const { spawn } = require('child_process');

// Twilio → CALLER AI: raw mulaw 8kHz chunks → PCM WAV 16kHz Buffer
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

// CALLER AI → Twilio: WAV Buffer → mulaw 8kHz buffer
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
    // Returning a raw Buffer, so the existing chunkSize splitting logic below stays exactly the same
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

// Pre-generated or on-demand cached natural audio filler to play immediately while retrieving/generating
let cachedFillerMulaw = null;
async function getFillerMulaw() {
  if (cachedFillerMulaw) return cachedFillerMulaw;
  try {
    const fillerText = "Give me a second, I'm looking that up for you.";
    const ttsBuf = await getGoogleTTS(fillerText, 'en');
    if (ttsBuf) {
      cachedFillerMulaw = await wavToMulawBuffer(ttsBuf);
    }
  } catch (err) {
    console.warn('[Stream] Could not pre-generate filler audio:', err.message);
  }
  return cachedFillerMulaw;
}
// Pre-warm filler on startup
getFillerMulaw().catch(() => {});

function handleStreamConnection(ws) {
  let streamSid = null;
  let callSid = null;
  let audioBuffer = [];
  let isAIProcessing = false;
  let isPlayingAudio = false;
  let silenceTimer = null;
  const SILENCE_THRESHOLD_MS = 550; // Tuned natural pause before endpointing
  let safetyUnlockTimeout = null;
  let latestUtteranceId = 0; // Monotonic counter to ensure responses are matched only to latest caller speech

  const resetAIState = (reason = '') => {
    if (reason) console.log(`[Stream] Resetting AI state: ${reason}`);
    isAIProcessing = false;
    isPlayingAudio = false;
    audioBuffer = [];
    if (safetyUnlockTimeout) {
      clearTimeout(safetyUnlockTimeout);
      safetyUnlockTimeout = null;
    }
  };

  // Helper to send mulaw audio chunks to Twilio
  const streamAudioToTwilio = async (rawMulaw, currentUtteranceId, markName = 'ai_done') => {
    if (!rawMulaw || rawMulaw.length === 0) return false;
    isPlayingAudio = true;

    const chunkSize = 640; // 80ms per chunk at 8kHz mulaw
    const pacingDelayMs = 20;

    for (let i = 0; i < rawMulaw.length; i += chunkSize) {
      // If a new caller utterance has superseded this one, abort stale playback
      if (currentUtteranceId && currentUtteranceId !== latestUtteranceId) {
        console.log(`[${callSid}] Aborting audio playback because newer utterance (${latestUtteranceId}) superseded (${currentUtteranceId})`);
        isPlayingAudio = false;
        return false;
      }
      if (ws.readyState !== 1) {
        console.warn(`[${callSid}] WebSocket disconnected during audio stream (state: ${ws.readyState})`);
        isPlayingAudio = false;
        return false;
      }
      const chunk = rawMulaw.slice(i, i + chunkSize);
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: {
          payload: chunk.toString('base64')
        }
      }));

      if (i + chunkSize < rawMulaw.length) {
        await new Promise(resolve => setTimeout(resolve, pacingDelayMs));
      }
    }

    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        event: 'mark',
        streamSid: streamSid,
        mark: { name: markName }
      }));
    }

    return true;
  };

  ws.on('error', (err) => {
    console.error(`[Stream Error - ${callSid || 'unregistered'}]:`, err.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[Stream Closed - ${callSid || 'unregistered'}]: code=${code}, reason=${reason?.toString() || 'none'}`);
    resetAIState('WebSocket closed');
  });

  ws.on('message', async (message) => {
    const msg = JSON.parse(message);
    
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      callSid = msg.start.callSid;
      console.log(`Stream started: ${streamSid} for call: ${callSid}`);
      
      // Initialize state if not already done by outbound
      const incomingCaller = msg.start?.customParameters?.caller || msg.start?.customParameters?.From || msg.start?.from || 'unknown';
      let session = getCallSession(callSid);
      if (!session) {
        session = createCallSession(callSid, incomingCaller, 'VED');
      } else if (session.phoneNumber === 'unknown' && incomingCaller !== 'unknown') {
        updateCallSession(callSid, { phoneNumber: incomingCaller });
      }

      // Notify frontend that the call is now live (picked up by recipient)
      if (global.broadcastEvent) {
        global.broadcastEvent('call_started', { callSid });
      }

      // FETCH MEMORY from MongoDB
      if (session.phoneNumber && session.phoneNumber !== 'unknown') {
        console.log(`[MongoDB] Fetching previous summaries for ${session.phoneNumber}...`);
        try {
          const memory = await getCallMemory(session.phoneNumber);
          if (memory && memory.length > 0) {
            console.log(`[MongoDB] Found ${memory.length} previous interactions for ${session.phoneNumber}`);
            updateCallSession(callSid, { memory });
          }
        } catch (err) {
          console.error(`[MongoDB] Error fetching memory:`, err.message);
        }
      }

      // FETCH KNOWLEDGE & INSTRUCTIONS from MongoDB
      console.log(`[MongoDB] Fetching profile for entity: ${session.entity || 'unknown'}...`);
      try {
        const entityProfile = await entityService.getEntityByName(session.entity);
        if (entityProfile) {
          console.log(`[MongoDB] Loaded profile for ${entityProfile.name}. Instructions length: ${entityProfile.instructions?.length || 0}`);
          updateCallSession(callSid, { 
            entity_id: entityProfile.id,
            instructions: entityProfile.instructions || '' 
          });
        }

        const knowledge = await getKnowledge(session.entity);
        if (knowledge && knowledge.length > 0) {
          console.log(`[MongoDB] Found ${knowledge.length} knowledge fragments for ${session.entity || 'unknown'}`);
          updateCallSession(callSid, { knowledge });
        }
      } catch (err) {
        console.error(`[MongoDB] Error fetching entity data:`, err.message);
      }

    } else if (msg.event === 'media') {
      const payloadBuffer = Buffer.from(msg.media.payload, 'base64');

      // VAD heuristic for 8kHz mulaw
      let loudCount = 0;
      for (let i = 0; i < payloadBuffer.length; i++) {
        let val = payloadBuffer[i];
        let amp = val < 128 ? 127 - val : 255 - val;
        if (amp > 22) loudCount++;
      }

      // Caller spoke with high vocal energy while AI was playing back full answer -> barge-in interruption
      if (isPlayingAudio && loudCount > 28) {
        console.log(`[${callSid}] User barge-in detected during AI speech (loudness: ${loudCount}). Halting current audio.`);
        isPlayingAudio = false;
        isAIProcessing = false;
        if (safetyUnlockTimeout) {
          clearTimeout(safetyUnlockTimeout);
          safetyUnlockTimeout = null;
        }
        if (ws.readyState === 1 && streamSid) {
          ws.send(JSON.stringify({
            event: 'clear',
            streamSid: streamSid
          }));
        }
        audioBuffer = [];
      }

      // If AI is currently outputting audio or running inference, DO NOT capture microphone audio!
      // This eliminates telephone acoustic echo (where AI hears its own voice and Whisper transcribes "Thank you")
      if (isPlayingAudio || isAIProcessing) {
        return;
      }

      // Voice Activity Detection & Endpointing
      if (loudCount > 14) {
        audioBuffer.push(msg.media.payload);
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (audioBuffer.length >= 4) {
            processUtterance();
          } else {
            audioBuffer = [];
          }
        }, SILENCE_THRESHOLD_MS);
      } else if (audioBuffer.length > 0) {
        // Capture trailing decay before endpointing
        audioBuffer.push(msg.media.payload);
        // Ensure silence timer continues running during trailing silence
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (audioBuffer.length >= 4) {
              processUtterance();
            } else {
              audioBuffer = [];
            }
          }, SILENCE_THRESHOLD_MS);
        }
      }
      
    } else if (msg.event === 'mark') {
      if (msg.mark?.name === 'ai_filler') {
        console.log(`[${callSid}] Natural filler finished playing, continuing answer pipeline`);
        isPlayingAudio = false;
      } else {
        console.log(`[${callSid}] AI finished speaking (mark: ${msg.mark?.name}), unlocking audio capture`);
        resetAIState('mark event received');
      }
    } else if (msg.event === 'stop') {
      console.log(`Stream stopped: ${streamSid}`);
      if (global.broadcastEvent) {
        global.broadcastEvent('call_ended', { callSid });
      }
      processPostCallSummary(callSid);
    }
  });

  async function processUtterance() {
    if (audioBuffer.length === 0 || isAIProcessing || isPlayingAudio) return;
    
    isAIProcessing = true;
    const currentAudio = [...audioBuffer];
    audioBuffer = []; // Clear for next utterance
    const utteranceId = ++latestUtteranceId;

    // Safety timeout: if pipeline doesn't finish within 12s, forcefully unlock so caller is never stranded
    if (safetyUnlockTimeout) clearTimeout(safetyUnlockTimeout);
    safetyUnlockTimeout = setTimeout(() => {
      console.warn(`[${callSid}] Safety timeout triggered (12s). Unlocking stream.`);
      resetAIState('Safety timeout (12s)');
    }, 12000);
    
    try {
      // 1. Decode & Resample asynchronously
      const pcm16Wav = await mulawToWavBuffer(currentAudio);
      
      // Check if another utterance arrived while resampling
      if (utteranceId !== latestUtteranceId) {
        console.log(`[${callSid}] Utterance #${utteranceId} superseded by #${latestUtteranceId}`);
        resetAIState('Superseded before STT');
        return;
      }

      // 2. STT (Groq Whisper)
      console.log(`\n--- [${callSid}] AUDIO CHUNK RECEIVED (Utterance #${utteranceId}) ---`);
      console.log(`[${callSid}] Sending ${pcm16Wav.length} bytes of audio to Groq Whisper STT...`);
      const sttResult = await getGroqSTT(pcm16Wav);
      
      if (!sttResult || !sttResult.transcript || sttResult.transcript.trim() === '') {
        resetAIState('Empty STT result');
        return;
      }

      if (utteranceId !== latestUtteranceId) {
        console.log(`[${callSid}] Utterance #${utteranceId} superseded after STT`);
        resetAIState('Superseded after STT');
        return;
      }
      
      const cleanTranscript = sttResult.transcript.trim().toLowerCase().replace(/[^\w\s]/g, '');
      const hallucinations = [
        "thanks for watching", "thank you for watching", "please subscribe", 
        "thank you", "thanks", "thank you very much", "bye", "you", "so", 
        "thank you so much", "see you next time", "subtitles by", "watching", "amara"
      ];

      // Whisper phantom hallucination filter:
      // When caller has not spoken a real sentence, Whisper defaults to "thank you" or "thanks".
      // Ignore isolated "thank you" or short noise chunks (<40 frames / ~800ms)
      if (hallucinations.includes(cleanTranscript) && currentAudio.length < 40) {
         console.log(`[${callSid}] Filtered Whisper phantom hallucination on noise/silence: "${sttResult.transcript}"`);
         resetAIState('Whisper hallucination filtered');
         return;
      }
      
      console.log(`[${callSid}] User said: "${sttResult.transcript}"`);
      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'user',
        text: sttResult.transcript,
        language: sttResult.language_code || 'en'
      });

      // Broadcast to Frontend
      if (global.broadcastEvent) {
        console.log(`[Stream] Broadcasting user transcript: ${sttResult.transcript}`);
        global.broadcastEvent('transcript', {
          speaker: 'user',
          text: sttResult.transcript,
          id: Date.now()
        });
      }

      const session = getCallSession(callSid);

      // Ensure fresh VED knowledge from database is always available
      let activeKnowledge = (session && session.knowledge && session.knowledge.length > 0) 
        ? session.knowledge 
        : await getKnowledge(session?.entity || 'VED');
      
      if (!activeKnowledge || activeKnowledge.length === 0) {
        activeKnowledge = await getKnowledge();
      }

      // 3. LLM (CALLER AI / VED)
      console.log(`\n--- [${callSid}] LLM PROCESSING (Utterance #${utteranceId}) ---`);
      console.log(`[${callSid}] Querying LLM (Active knowledge fragments: ${activeKnowledge.length})...`);
      const aiResponse = await getLLMResponse(
        session ? session.turns : [], 
        sttResult.transcript, 
        session ? (session.memory || []) : [],
        activeKnowledge,
        session ? (session.instructions || '') : ''
      );

      // Check again if caller spoke a newer question while LLM was processing
      if (utteranceId !== latestUtteranceId) {
        console.log(`[${callSid}] Discarding LLM response for #${utteranceId} because caller spoke again (#${latestUtteranceId})`);
        resetAIState('Superseded after LLM');
        return;
      }

      console.log(`[${callSid}] LLM Answer: "${aiResponse.spoken}" (Language: ${aiResponse.language})`);
      
      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'ai',
        text: aiResponse.spoken,
        intent: aiResponse.intent,
        entities: aiResponse.entities,
        sentiment: aiResponse.sentiment,
        language: aiResponse.language
      });

      // Broadcast to Frontend
      if (global.broadcastEvent) {
        console.log(`[Stream] Broadcasting AI transcript: ${aiResponse.spoken}`);
        global.broadcastEvent('transcript', {
          speaker: 'ai',
          text: aiResponse.spoken,
          id: Date.now()
        });
      }

      // 4. TTS (Google TTS) in Caller's detected language
      console.log(`[${callSid}] Requesting TTS for: "${aiResponse.spoken}" (Language: ${aiResponse.language})...`);
      const ttsBuffer = await getGoogleTTS(aiResponse.spoken, aiResponse.language);
      
      if (utteranceId !== latestUtteranceId) {
        console.log(`[${callSid}] Discarding TTS playback for #${utteranceId} due to newer utterance #${latestUtteranceId}`);
        resetAIState('Superseded after TTS');
        return;
      }

      if (ttsBuffer) {
        // 5. Encode back to mulaw and send to Twilio
        const rawMulaw = await wavToMulawBuffer(ttsBuffer);
        const audioDurationMs = Math.round((rawMulaw.length / 8000) * 1000);
        console.log(`[${callSid}] Streaming ${rawMulaw.length} bytes mulaw audio (~${(audioDurationMs / 1000).toFixed(1)}s) to Twilio...`);

        // Send the audio
        await streamAudioToTwilio(rawMulaw, utteranceId, 'ai_done');

        // Allow audio playback duration + 400ms buffer, then automatically unlock state
        // This ensures that even if Twilio drops or delays the 'mark' callback, VED never stays locked
        if (safetyUnlockTimeout) clearTimeout(safetyUnlockTimeout);
        safetyUnlockTimeout = setTimeout(() => {
          console.log(`[${callSid}] Playback window completed (~${audioDurationMs}ms). Unlocking audio capture.`);
          resetAIState('Playback window completed');
        }, audioDurationMs + 400);

      } else {
        resetAIState('TTS result empty');
      }

    } catch (e) {
      console.error(`[${callSid}] Error in audio pipeline:`, e);
      resetAIState('Catch block error');
    }
  }
}

async function processPostCallSummary(callSid) {
  const session = getCallSession(callSid);
  if (!session) {
    console.error(`[${callSid}] Error: No session found for summary generation.`);
    return;
  }
  
  if (session.turns.length === 0) {
    console.log(`[${callSid}] No conversation turns detected. Skipping summary.`);
    return;
  }
  
  console.log(`[${callSid}] Generating post-call summary and intent for ${session.turns.length} turns...`);
  const summary = await summarizeCall(session.turns);
  
  if (summary) {
    updateCallSession(callSid, {
      summary: summary,
      resolution_status: summary.resolution || 'pending'
    });
    console.log(`[${callSid}] Summary generated: "${summary.summary.substring(0, 50)}..."`);
    
    // SAVE TO MongoDB (New Calls Collection)
    const callData = {
      phone: session.phoneNumber,
      entity_id: session.entity_id,
      transcript: session.turns,
      summary: summary.summary,
      intent: summary.key_intent,
      resolution: summary.resolution,
      meta: summary.important_details
    };

    console.log(`[MongoDB] Attempting to save call record for ${session.phoneNumber}...`);
    try {
      await saveCall(callData);
      console.log(`[MongoDB] Call record saved successfully.`);

      // 3. AUTO-LEAD GENERATION
      const positiveIntents = ['interest', 'admission', 'sales', 'positive', 'high_interest'];
      if (positiveIntents.includes(summary.key_intent?.toLowerCase()) || summary.resolution === 'resolved') {
        console.log(`[LeadService] High interest detected. Generating lead...`);
        await leadService.createLead({
          phone: session.phoneNumber,
          name: 'Anonymous Caller', // Would ideally extract from transcript entities
          interest: summary.key_intent,
          entity_id: session.entity_id,
          meta: summary.important_details
        });
      }
    } catch (err) {
      console.error(`[MongoDB] Error in post-call data flow:`, err.message);
    }
  } else {
    console.error(`[${callSid}] Failed to generate summary from LLM.`);
  }
}

module.exports = {
  handleStreamConnection
};
