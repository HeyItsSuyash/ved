const { handleStreamConnection } = require('../twilio/stream');
const EventEmitter = require('events');

/**
 * Exotel Audio Stream Adapter
 * Normalizes Exotel binary audio & JSON packets into standard Twilio-compatible envelopes
 * so the core STT/LLM/TTS conversational pipeline processes both seamlesssly.
 */
function handleExotelStreamConnection(ws, req) {
  const clientIp = req?.socket?.remoteAddress || 'unknown';
  const queryParams = req?.url ? new URL(req.url, 'http://localhost').searchParams : new URLSearchParams();

  let callSid = queryParams.get('callSid') || queryParams.get('CallSid') || `exo_${Date.now()}`;
  let streamSid = queryParams.get('streamSid') || `exostream_${Date.now()}`;
  let caller = queryParams.get('caller') || queryParams.get('From') || 'Inbound Caller';

  console.log(`[ExotelStream:INIT] Connection from ${clientIp} | Call: ${callSid} | Stream: ${streamSid}`);

  // Create an adapter socket that wraps ws so twilio/stream.js gets normalized packets
  const adapterWs = new EventEmitter();
  adapterWs.readyState = ws.readyState;

  // Sync readyState and methods
  adapterWs.send = (payload) => {
    if (ws.readyState === 1) {
      // Both Twilio and Exotel expect JSON events with media.payload (base64)
      ws.send(payload);
    }
  };

  adapterWs.close = (code, reason) => ws.close(code, reason);

  ws.on('open', () => {
    adapterWs.readyState = ws.readyState;
    adapterWs.emit('open');
  });

  ws.on('close', (code, reason) => {
    adapterWs.readyState = ws.readyState;
    console.log(`[ExotelStream:CLOSE] Socket closed: ${code} (${reason?.toString() || 'none'})`);
    adapterWs.emit('close', code, reason);
  });

  ws.on('error', (err) => {
    console.error(`[ExotelStream:ERROR]`, err.message);
    adapterWs.emit('error', err);
  });

  let hasSentStart = false;

  ws.on('message', (data, isBinary) => {
    // 1. Raw Binary Audio Frame (Exotel audio stream sends raw PCM/mulaw binary buffers)
    if (isBinary || Buffer.isBuffer(data) && !data.toString('utf8').trim().startsWith('{')) {
      const base64Audio = Buffer.from(data).toString('base64');

      if (!hasSentStart) {
        hasSentStart = true;
        const startPacket = {
          event: 'start',
          start: {
            streamSid,
            callSid,
            customParameters: { caller, From: caller }
          }
        };
        adapterWs.emit('message', JSON.stringify(startPacket));
      }

      const mediaPacket = {
        event: 'media',
        streamSid,
        media: {
          payload: base64Audio
        }
      };
      adapterWs.emit('message', JSON.stringify(mediaPacket));
      return;
    }

    // 2. JSON Packet (Exotel JSON streaming event)
    try {
      const text = data.toString('utf8');
      const parsed = JSON.parse(text);

      const eventType = parsed.event || parsed.type;

      if (eventType === 'connected' || eventType === 'start') {
        hasSentStart = true;
        streamSid = parsed.streamSid || parsed.stream_sid || parsed.start?.streamSid || streamSid;
        callSid = parsed.callSid || parsed.call_sid || parsed.start?.callSid || callSid;

        const normalizedStart = {
          event: 'start',
          start: {
            streamSid,
            callSid,
            customParameters: parsed.start?.customParameters || { caller, From: caller }
          }
        };
        adapterWs.emit('message', JSON.stringify(normalizedStart));

      } else if (eventType === 'media' || parsed.media || parsed.data) {
        const payload = parsed.media?.payload || parsed.payload || parsed.data;
        if (payload) {
          const normalizedMedia = {
            event: 'media',
            streamSid,
            media: {
              payload: payload
            }
          };
          adapterWs.emit('message', JSON.stringify(normalizedMedia));
        }

      } else if (eventType === 'stop' || eventType === 'close') {
        const normalizedStop = {
          event: 'stop',
          streamSid
        };
        adapterWs.emit('message', JSON.stringify(normalizedStop));

      } else if (eventType === 'mark') {
        adapterWs.emit('message', JSON.stringify(parsed));
      } else {
        // Passthrough other events
        adapterWs.emit('message', text);
      }

    } catch (err) {
      console.warn('[ExotelStream] Fallback binary audio handling:', err.message);
      const base64Audio = Buffer.from(data).toString('base64');
      const mediaPacket = {
        event: 'media',
        streamSid,
        media: { payload: base64Audio }
      };
      adapterWs.emit('message', JSON.stringify(mediaPacket));
    }
  });

  // Attach core conversation engine to adapted stream
  handleStreamConnection(adapterWs);
}

module.exports = {
  handleExotelStreamConnection
};
