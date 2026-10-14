/**
 * Exotel Voice Webhook Handlers
 */

function handleExotelVoiceWebhook(req, res) {
  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || 'http://localhost:3001';
  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/exotel/stream';

  const callSid = req.body?.CallSid || req.query?.CallSid || req.body?.CallUUID || `exo_${Date.now()}`;
  const caller = req.body?.From || req.query?.From || 'Unknown';

  console.log(`[ExotelWebhook] Incoming voice request for call ${callSid} from ${caller}`);

  // Return ExoML stream configuration
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

  res.set('Content-Type', 'application/xml');
  res.send(exoML);
}

function handleExotelStatusCallback(req, res) {
  const callSid = req.body?.CallSid || req.body?.CallUUID;
  const status = req.body?.Status || req.body?.CallStatus;
  const duration = req.body?.Duration || req.body?.Legs?.[0]?.Duration;

  console.log(`[ExotelStatus] Call ${callSid} status: ${status}, duration: ${duration || 'N/A'}s`);
  res.json({ success: true });
}

module.exports = {
  handleExotelVoiceWebhook,
  handleExotelStatusCallback
};
