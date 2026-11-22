const { getAllCalls, getCallSession, createCallSession, updateCallSession } = require('../../state/calls');
const { getSettings } = require('../../services/settings');
const { activeForwardingNumbers } = require('../../services/forwarding');
const { url, wsUrl, helplineNumber } = require('./config');
const { lineFor } = require('./lines');
const xml = require('./xml');

const HANDOVER_REASONS = new Set(['agent_requested', 'caller_pressed_0']);

function activeAgentCalls() {
  return getAllCalls().filter((c) => c.provider === 'plivo' && c.aiActive && !c.endTime).length;
}

/** Why the agent cannot take a call right now, or null if it can. */
function agentUnavailableReason() {
  const s = getSettings();
  if (!s.agentEnabled) return 'agent_disabled';
  if (activeAgentCalls() >= s.maxConcurrentCalls) return 'at_capacity';
  return null;
}

function ensureSession(callUuid, { caller, direction }) {
  let session = getCallSession(callUuid);
  if (!session) {
    session = createCallSession(callUuid, caller || 'unknown', 'VED');
    updateCallSession(callUuid, { provider: 'plivo', direction: direction || 'inbound' });
  }
  return getCallSession(callUuid);
}

/** Start recording once per call: the first XML document the call runs. */
function recordingCallback(callUuid) {
  const session = getCallSession(callUuid);
  if (!session || session.recordingStarted) return undefined;
  updateCallSession(callUuid, { recordingStarted: true });
  return url('/plivo/recording');
}

function streamResponse(callUuid, { resume = false } = {}) {
  updateCallSession(callUuid, { aiActive: true });
  return xml.streamXml({
    wsUrl: wsUrl(`/plivo/stream/${encodeURIComponent(callUuid)}${resume ? '?resume=1' : ''}`),
    statusCallbackUrl: url('/plivo/stream-status'),
    afterStreamUrl: url(`/plivo/after-stream/${encodeURIComponent(callUuid)}`),
    recordingCallbackUrl: recordingCallback(callUuid),
  });
}

/**
 * The forwarding chain: ring each active staff number in order. When one is busy or
 * does not answer, Plivo reports DialStatus to /plivo/dial-status and we try the next.
 */
async function forwardResponse(callUuid, { attempt = 0, reason, calledNumber }) {
  const settings = getSettings();
  const numbers = await activeForwardingNumbers();
  const callerId = helplineNumber() || calledNumber;

  if (attempt < numbers.length && callerId) {
    const recordingCallbackUrl = recordingCallback(callUuid);
    updateCallSession(callUuid, { outcome: 'forwarded', forwardReason: reason, aiActive: false });
    return xml.dialXml({
      number: numbers[attempt].number,
      callerId,
      timeout: settings.forwardTimeoutSeconds,
      actionUrl: url(
        `/plivo/dial-status/${encodeURIComponent(callUuid)}?attempt=${attempt}&reason=${encodeURIComponent(reason)}`
      ),
      // A caller forwarded straight from the answer URL never heard the greeting, so the
      // recording notice plays first, as its own line; the hold message stays exactly as written.
      announce:
        attempt === 0
          ? recordingCallbackUrl
            ? [lineFor('recording_notice'), lineFor('hold')]
            : [lineFor('hold')]
          : undefined,
      recordingCallbackUrl,
    });
  }

  // Nobody picked up after the agent handed this caller over: their question goes to a
  // counsellor for follow-up, then the closing greeting, then the call ends.
  if (HANDOVER_REASONS.has(reason)) {
    const s = getCallSession(callUuid);
    const lastQuestion = [...(s?.turns || [])].reverse().find((t) => t.speaker === 'user')?.text || null;
    updateCallSession(callUuid, {
      outcome: 'answered_by_ai',
      forwardReason: `${reason}_unanswered`,
      followUp: true,
      followUpQuestion: lastQuestion,
      aiActive: false,
    });
    return xml.sayAndHangupXml(lineFor('follow_up'), lineFor('closing'));
  }

  const session = getCallSession(callUuid);
  const talkedToAgent = session?.turns?.some((t) => t.speaker === 'user');
  updateCallSession(callUuid, { outcome: talkedToAgent ? 'answered_by_ai' : 'missed', aiActive: false });
  return xml.sayAndHangupXml(lineFor('unavailable'));
}

/**
 * True when this number has already called maxCallsPerHour times in the last hour
 * (saved calls plus any still in progress). 0 turns the limit off.
 */
async function overCallLimit(phone, callUuid) {
  const limit = getSettings().maxCallsPerHour;
  if (!limit || !phone || phone === 'unknown') return false;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const prisma = require('../../services/db');
  let saved;
  try {
    // Calls already turned away do not count, so a blocked caller is let in again after an hour.
    saved = await prisma.call.count({
      where: { phone, createdAt: { gte: since }, OR: [{ outcome: null }, { outcome: { not: 'rate_limited' } }] },
    });
  } catch (err) {
    console.error('[Plivo] Rate-limit check failed, letting the call in:', err.message);
    return false;
  }
  const live = getAllCalls().filter((c) => c.phoneNumber === phone && c.callSid !== callUuid && !c.finalized).length;
  return saved + live >= limit;
}

async function staffAvailable() {
  return (await activeForwardingNumbers()).length > 0;
}

module.exports = { overCallLimit, staffAvailable, activeAgentCalls, agentUnavailableReason, ensureSession, streamResponse, forwardResponse };
