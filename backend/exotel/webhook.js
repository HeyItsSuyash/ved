/**
 * Exotel Voice & Status Webhook Handlers
 * Enhanced with deep request diagnostics, fallback ExoML, and error tracking.
 */

function handleExotelVoiceWebhook(req, res) {
  const method = req.method;
  const query = req.query || {};
  const body = req.body || {};

  console.log('----------------------------------------------------');
  console.log(`[ExotelWebhook:VOICE] Received ${method} voice webhook`);
  console.log('[ExotelWebhook:QUERY]:', JSON.stringify(query));
  console.log('[ExotelWebhook:BODY]:', JSON.stringify(body));
  console.log('[ExotelWebhook:HEADERS]:', JSON.stringify(req.headers));

  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || 'https://ved-avga.onrender.com';
  const cleanServer = serverUrl.replace(/\/$/, '');
  const wsUrl = cleanServer.replace(/^http/, 'ws') + '/exotel/stream';

  const callSid = body.CallSid || query.CallSid || body.CallUUID || query.CallUUID || `exo_${Date.now()}`;
  const caller = body.From || query.From || body.CallFrom || query.CallFrom || 'Unknown';
  const dialedNumber = body.To || query.To || body.DialWhomNumber || '08047281152';

  console.log(`[ExotelWebhook:CALL_INIT] CallSid: ${callSid} | Caller: ${caller} | Dialed: ${dialedNumber}`);
  console.log(`[ExotelWebhook:WS_TARGET] Directing Exotel stream to: ${wsUrl}`);

  // Exotel ExoML response connecting to WebSocket Audio Stream
  // Includes fallback Say in case stream handshake takes 100ms to open
  const exoML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="caller" value="${caller}" />
      <Parameter name="provider" value="exotel" />
    </Stream>
  </Connect>
</Response>`;

  console.log('[ExotelWebhook:RESPONSE_EXOML]:', exoML);
  res.set('Content-Type', 'application/xml');
  res.send(exoML);
}

function handleExotelStatusCallback(req, res) {
  console.log('----------------------------------------------------');
  console.log('[ExotelStatusCallback:STATUS] Call status update received:');
  console.log('[ExotelStatusCallback:BODY]:', JSON.stringify(req.body));
  console.log('[ExotelStatusCallback:QUERY]:', JSON.stringify(req.query));

  const callSid = req.body?.CallSid || req.query?.CallSid || req.body?.CallUUID;
  const status = req.body?.Status || req.query?.Status || req.body?.CallStatus;
  const duration = req.body?.Duration || req.query?.Duration || req.body?.Legs?.[0]?.Duration;
  const terminationReason = req.body?.TerminationReason || req.body?.HangupCause || req.query?.HangupCause;

  console.log(`[ExotelStatusCallback] SID: ${callSid} | Status: ${status} | Duration: ${duration || 0}s | TerminationReason: ${terminationReason || 'N/A'}`);

  res.json({ success: true, callSid, status });
}

module.exports = {
  handleExotelVoiceWebhook,
  handleExotelStatusCallback
};
