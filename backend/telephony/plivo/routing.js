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
      // A caller forwarded straight from the answer URL never heard the greeting, so
      // the recording notice goes in the hold message.
      announce: attempt === 0 ? lineFor(recordingCallbackUrl ? 'hold_recorded' : 'hold') : undefined,
      recordingCallbackUrl,
    });
  }

  // Nobody picked up. If the agent handed this caller over and still has room, take them back.
  if (HANDOVER_REASONS.has(reason) && !agentUnavailableReason()) {
    updateCallSession(callUuid, { outcome: undefined, forwardReason: `${reason}_unanswered` });
    return streamResponse(callUuid, { resume: true });
  }

  const session = getCallSession(callUuid);
  const talkedToAgent = session?.turns?.some((t) => t.speaker === 'user');
  updateCallSession(callUuid, { outcome: talkedToAgent ? 'answered_by_ai' : 'missed', aiActive: false });
  return xml.sayAndHangupXml(lineFor('unavailable'));
}

module.exports = { activeAgentCalls, agentUnavailableReason, ensureSession, streamResponse, forwardResponse };
