const express = require('express');
const { getSettings, updateSettings } = require('../services/settings');
const forwarding = require('../services/forwarding');
const { plivoConfigured, plivoClient, helplineNumber, url, publicBaseUrl } = require('../telephony/plivo/config');
const { activeAgentCalls } = require('../telephony/plivo/routing');
const { ttsProvider } = require('../pipeline/tts');

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
