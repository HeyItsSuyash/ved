const express = require('express');
const { getCallSession, updateCallSession } = require('../../state/calls');
const { finalizeCall } = require('../../services/callRecords');
const { activeForwardingNumbers } = require('../../services/forwarding');
const { requirePlivoSignature } = require('./signature');
const { agentUnavailableReason, ensureSession, streamResponse, forwardResponse } = require('./routing');
const xml = require('./xml');
const { audioFor, lineFor } = require('./lines');
const { textForCall } = require('../../services/verification');
const { ttsProvider, mp3For } = require('../../pipeline/tts');
const { url } = require('./config');
const prisma = require('../../services/db');

const router = express.Router();

/** MP3s for <Play>: hold and busy messages in the agent's voice. Plivo fetches these unsigned. */
router.get('/audio/:file', async (req, res) => {
  try {
    const mp3 = await audioFor(req.params.file);
    if (!mp3) return res.status(404).send('Not found');
    res.set('Cache-Control', 'public, max-age=86400').type('audio/mpeg').send(mp3);
  } catch (err) {
    console.error('[Plivo] Audio failed:', err.message);
    res.status(502).send('Audio unavailable');
  }
});

/** Audio for a verification call; the token in the path is random and expires in 10 minutes. */
router.get('/otp-audio/:token.mp3', async (req, res) => {
  const text = textForCall(req.params.token);
  if (!text) return res.status(404).send('Not found');
  try {
    res.type('audio/mpeg').send(await mp3For(text, null, { cache: false }));
  } catch (err) {
    console.error('[Plivo] OTP audio failed:', err.message);
    res.status(502).send('Audio unavailable');
  }
});

router.use(requirePlivoSignature);

/** Answer URL of a verification call: read the code out twice, then hang up. */
router.all('/otp/:token', (req, res) => {
  const text = textForCall(req.params.token);
  if (!text) return sendXml(res, xml.hangupXml());
  const audioUrl = ttsProvider() === 'elevenlabs' ? url(`/plivo/otp-audio/${req.params.token}.mp3`) : null;
  sendXml(res, xml.sayAndHangupXml({ text, audioUrl }));
});

const param = (req, key) => (req.body && req.body[key]) || req.query[key];

function sendXml(res, body) {
  res.status(200).type('application/xml').send(body);
}

/** Answer URL: the agent takes the call, or it goes straight to staff when the agent is busy or off. */
router.all('/answer', async (req, res) => {
  const callUuid = param(req, 'CallUUID');
  const direction = param(req, 'Direction') || 'inbound';
  const caller = direction === 'outbound' ? param(req, 'To') : param(req, 'From');
  if (!callUuid) return res.status(400).type('text/plain').send('Missing CallUUID');

  try {
    const session = ensureSession(callUuid, { caller, direction });
    console.log(`[Plivo] Answer ${callUuid} ${direction} from ${caller}`);

    // Plivo retries callbacks: give a repeated request the same answer.
    if (session.aiActive) return sendXml(res, streamResponse(callUuid));

    const busy = agentUnavailableReason();
    if (!busy) return sendXml(res, streamResponse(callUuid));

    console.log(`[Plivo] Agent unavailable (${busy}), forwarding ${callUuid}`);
    return sendXml(res, await forwardResponse(callUuid, { reason: busy, calledNumber: param(req, 'To') }));
  } catch (err) {
    console.error('[Plivo] Answer failed:', err);
    return sendXml(res, xml.sayAndHangupXml(lineFor('error')));
  }
});

/** Runs when the agent's stream closed while the caller was still on the line. */
router.all('/after-stream/:uuid', async (req, res) => {
  const callUuid = req.params.uuid;
  updateCallSession(callUuid, { aiActive: false });
  console.warn(`[Plivo] Stream ended with caller still connected, forwarding ${callUuid}`);
  sendXml(res, await forwardResponse(callUuid, { reason: 'agent_dropped', calledNumber: param(req, 'To') }));
});

/** Transfer target when the agent hands a caller to staff mid-call. */
router.all('/forward/:uuid', async (req, res) => {
  const callUuid = req.params.uuid;
  const reason = req.query.reason || 'agent_requested';
  updateCallSession(callUuid, { aiActive: false });
  sendXml(res, await forwardResponse(callUuid, { reason, calledNumber: param(req, 'To') }));
});

/** Result of ringing one staff number: done if answered, otherwise try the next. */
router.all('/dial-status/:uuid', async (req, res) => {
  const callUuid = req.params.uuid;
  const attempt = Number(req.query.attempt) || 0;
  const reason = req.query.reason || 'unknown';
  const status = param(req, 'DialStatus');
  console.log(`[Plivo] Dial ${callUuid} attempt ${attempt}: ${status}`);

  if (status === 'completed') {
    const numbers = await activeForwardingNumbers();
    updateCallSession(callUuid, { outcome: 'forwarded', forwardedTo: numbers[attempt]?.number || null });
    return sendXml(res, xml.hangupXml());
  }
  return sendXml(res, await forwardResponse(callUuid, { attempt: attempt + 1, reason, calledNumber: param(req, 'To') }));
});

/** Hangup URL: the call is over, whatever path it took. */
router.all('/hangup', async (req, res) => {
  const callUuid = param(req, 'CallUUID');
  res.status(200).send('OK');
  if (!callUuid || !getCallSession(callUuid)) return;
  console.log(`[Plivo] Hangup ${callUuid}: ${param(req, 'HangupCauseName') || param(req, 'HangupCause') || ''}`);
  updateCallSession(callUuid, { aiActive: false, hangupCause: param(req, 'HangupCauseName') || null });
  await finalizeCall(callUuid);
});

/** Recording finished: keep its link with the call. Often arrives after the hang-up. */
router.all('/recording', async (req, res) => {
  res.status(200).send('OK');
  const callUuid = param(req, 'CallUUID');
  const recordingUrl = param(req, 'RecordUrl') || param(req, 'RecordingUrl');
  if (!callUuid || !recordingUrl) return;
  console.log(`[Plivo] Recording ready for ${callUuid}`);
  if (getCallSession(callUuid)) updateCallSession(callUuid, { recordingUrl });
  try {
    await prisma.call.updateMany({ where: { provider_call_id: callUuid }, data: { recording_url: recordingUrl } });
  } catch (err) {
    console.error('[Plivo] Could not save recording link:', err.message);
  }
});

/** <Stream> status callback: the only push signal for dropped or degraded streams. */
router.all('/stream-status', (req, res) => {
  console.log(
    `[Plivo] Stream ${param(req, 'StreamID') || ''} for ${param(req, 'CallUUID') || ''}: ${param(req, 'Event') || param(req, 'Status') || 'unknown'}`
  );
  res.status(200).send('OK');
});

module.exports = router;
