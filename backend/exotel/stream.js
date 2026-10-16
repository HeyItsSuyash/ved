const { handleStreamConnection } = require('../twilio/stream');
const { createCallSession, getCallSession, updateCallSession } = require('../state/calls');

/**
 * Robust Exotel Audio Streaming WebSocket Handler
 * Handles message normalization, binary frame passthrough, and deep diagnostic logging.
 */
function handleExotelStreamConnection(ws, req) {
  const clientIp = req?.socket?.remoteAddress || 'unknown';
  const queryParams = req?.url ? new URL(req.url, 'http://localhost').searchParams : new URLSearchParams();
  
  console.log(`[ExotelStream:INIT] Connection established from IP: ${clientIp}`);
  console.log(`[ExotelStream:INIT] Headers: ${JSON.stringify(req?.headers || {})}`);
  console.log(`[ExotelStream:INIT] Query params: ${queryParams.toString()}`);

  let callSid = queryParams.get('callSid') || queryParams.get('CallSid') || null;
  let streamSid = queryParams.get('streamSid') || null;

  // Track socket lifecycle
  ws.on('error', (err) => {
    console.error(`[ExotelStream:ERROR] WebSocket error on call ${callSid || 'unregistered'}:`, err.message, err.stack);
  });

  ws.on('close', (code, reason) => {
    console.warn(`[ExotelStream:CLOSE] WebSocket closed! Code: ${code}, Reason: ${reason?.toString() || 'No reason provided'} | CallSid: ${callSid}`);
  });

  // Pre-process messages before passing to twilio/stream.js
  const rawOn = ws.on.bind(ws);
  const listeners = [];

  // Listen to messages for diagnostic tracking & format adaptation
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      console.log(`[ExotelStream:RAW_BINARY] Received raw binary audio chunk: ${data.length} bytes`);
      return;
    }

    try {
      const text = data.toString('utf8');
      const parsed = JSON.parse(text);

      console.log(`[ExotelStream:EVENT] Received event: '${parsed.event || parsed.type}' | Keys: ${Object.keys(parsed).join(', ')}`);

      if (parsed.event === 'start' || parsed.event === 'connected') {
        streamSid = parsed.streamSid || parsed.stream_sid || parsed.start?.streamSid;
        callSid = parsed.callSid || parsed.call_sid || parsed.start?.callSid || callSid;
        console.log(`[ExotelStream:START] Stream details -> streamSid: ${streamSid}, callSid: ${callSid}`);
      } else if (parsed.event === 'stop' || parsed.event === 'close') {
        console.log(`[ExotelStream:STOP] Exotel sent stop event: ${JSON.stringify(parsed)}`);
      }
    } catch (err) {
      console.warn('[ExotelStream:PARSE_WARN] Failed to parse message as JSON:', err.message);
    }
  });

  // Attach core conversation engine
  handleStreamConnection(ws);
}

module.exports = {
  handleExotelStreamConnection
};
