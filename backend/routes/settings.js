const express = require('express');
const { getSettings, updateSettings, VOICES, TONES } = require('../services/settings');
const verification = require('../services/verification');
const forwarding = require('../services/forwarding');
const { plivoConfigured, plivoClient, helplineNumber, url, publicBaseUrl } = require('../telephony/plivo/config');
const { activeAgentCalls } = require('../telephony/plivo/routing');
const { ttsProvider, mp3For } = require('../pipeline/tts');

const router = express.Router();

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    const notFound = err.code === 'P2025';
    res.status(notFound ? 404 : 400).json({ error: notFound ? 'Not found' : err.message });
  }
};

function provider() {
  return (process.env.TELEPHONY_PROVIDER || (plivoConfigured() ? 'plivo' : 'exotel')).toLowerCase();
}

// Agent and routing settings ---------------------------------------------------

router.get('/settings', (req, res) => res.json(getSettings()));

router.put('/settings', wrap(async (req, res) => res.json(await updateSettings(req.body))));

// Forwarding numbers -----------------------------------------------------------

router.get('/forwarding', wrap(async (req, res) => res.json({ numbers: await forwarding.listForwardingNumbers() })));

router.post('/forwarding', wrap(async (req, res) => res.json({ numbers: await forwarding.addForwardingNumber(req.body) })));

router.patch(
  '/forwarding/:id',
  wrap(async (req, res) => res.json({ numbers: await forwarding.updateForwardingNumber(req.params.id, req.body) }))
);

router.delete(
  '/forwarding/:id',
  wrap(async (req, res) => res.json({ numbers: await forwarding.removeForwardingNumber(req.params.id) }))
);

router.post(
  '/forwarding/order',
  wrap(async (req, res) => res.json({ numbers: await forwarding.reorderForwardingNumbers(req.body.ids) }))
);

router.post(
  '/forwarding/:id/send-code',
  wrap(async (req, res) => {
    await verification.sendCode(req.params.id);
    res.json({ numbers: await forwarding.listForwardingNumbers() });
  })
);

router.post(
  '/forwarding/:id/verify',
  wrap(async (req, res) => {
    await verification.verifyCode(req.params.id, req.body.code);
    res.json({ numbers: await forwarding.listForwardingNumbers() });
  })
);

// Voices ----------------------------------------------------------------------

router.get('/voices', (req, res) => {
  res.json({
    available: ttsProvider() === 'elevenlabs',
    voices: VOICES,
    tones: Object.entries(TONES).map(([id, t]) => ({ id, label: t.label })),
  });
});

/** Hear a voice, tone and speed before saving them. */
router.post(
  '/voices/preview',
  wrap(async (req, res) => {
    if (ttsProvider() !== 'elevenlabs') throw new Error('Voice preview needs ELEVENLABS_API_KEY on the backend.');
    const { voiceId, voiceTone, voiceSpeed, text } = req.body || {};
    if (!VOICES.some((v) => v.id === voiceId)) throw new Error('Unknown voice');
    if (!TONES[voiceTone]) throw new Error('Unknown tone');
    const speed = Number(voiceSpeed);
    if (!(speed >= 0.7 && speed <= 1.2)) throw new Error('Speed must be from 0.7 to 1.2');
    const line = typeof text === 'string' && text.trim() ? text.trim().slice(0, 300) : getSettings().greeting;
    const mp3 = await mp3For(line, { id: voiceId, tone: voiceTone, speed }, { cache: false });
    res.type('audio/mpeg').send(mp3);
  })
);

// Telephony status and test call ----------------------------------------------

router.get('/telephony/status', (req, res) => {
  const p = provider();
  res.json({
    provider: p,
    helpline: p === 'plivo' ? helplineNumber() : process.env.EXOTEL_CALLER_ID || null,
    plivoConfigured: plivoConfigured(),
    publicUrlConfigured: Boolean(publicBaseUrl()),
    tts: ttsProvider(),
    activeAgentCalls: activeAgentCalls(),
  });
});

/** Place a call from the helpline to a staff phone so they can talk to the agent. */
router.post(
  '/test-call',
  wrap(async (req, res) => {
    const to = forwarding.normaliseNumber(req.body.to);
    if (provider() !== 'plivo') {
      const { performExotelOutboundCall } = require('../exotel/service');
      const call = await performExotelOutboundCall({ to, entityName: 'VED' });
      return res.json({ provider: 'exotel', callId: call.sid });
    }
    const from = helplineNumber();
    if (!from) throw new Error('PLIVO_NUMBER is not set');
    const call = await plivoClient().calls.create(from, to, url('/plivo/answer'), {
      answerMethod: 'POST',
      hangupUrl: url('/plivo/hangup'),
      hangupMethod: 'POST',
    });
    res.json({ provider: 'plivo', callId: call.requestUuid || call.request_uuid || null });
  })
);

module.exports = router;
