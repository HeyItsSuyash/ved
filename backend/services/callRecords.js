const prisma = require('./db');
const { getCallSession, updateCallSession } = require('../state/calls');
const { summarizeCall } = require('./llm');
const { saveCallSummary } = require('./mongodb');

/**
 * Persist a finished call once. Safe to call from several places (stream close,
 * hang-up webhook): only the first call does the work.
 */
async function finalizeCall(callSid, extra = {}) {
  const session = getCallSession(callSid);
  if (!session || session.finalized) return null;

  const endTime = session.endTime || new Date().toISOString();
  updateCallSession(callSid, { ...extra, endTime, status: 'ended', finalized: true });
  if (global.broadcastEvent) global.broadcastEvent('call_ended', { callSid });

  const s = getCallSession(callSid);
  const started = s.startTime ? new Date(s.startTime) : null;
  const ended = new Date(endTime);
  const durationS = started ? Math.max(0, Math.round((ended - started) / 1000)) : null;

  let summary = null;
  if (s.turns.length > 0) {
    try {
      summary = await summarizeCall(s.turns);
    } catch (err) {
      console.error(`[Calls] Summary failed for ${callSid}:`, err.message);
    }
  }

  const outcome = s.outcome || (s.turns.length > 0 ? 'answered_by_ai' : 'missed');
  const resolution =
    summary?.resolution || (outcome === 'forwarded' ? 'escalated' : outcome === 'missed' ? 'unresolved' : null);

  try {
    const record = await prisma.call.create({
      data: {
        phone: s.phoneNumber,
        summary: summary?.summary || describeWithoutSummary(s, outcome),
        intent: summary?.key_intent || null,
        resolution_status: resolution,
        provider: s.provider || null,
        provider_call_id: callSid,
        started_at: started,
        ended_at: ended,
        duration_s: durationS,
        outcome,
        forwarded_to: s.forwardedTo || null,
        callData: {
          transcript: s.turns,
          startTime: s.startTime,
          endTime,
          meta: summary?.important_details || {},
          forwardReason: s.forwardReason || null,
        },
      },
    });

    if (s.phoneNumber && s.phoneNumber !== 'unknown' && summary) {
      await saveCallSummary(s.phoneNumber, {
        summary: summary.summary,
        intent: summary.key_intent,
        important_details: summary.important_details,
      });
    }
    updateCallSession(callSid, { summary: summary?.summary || null, resolution_status: resolution });
    return record;
  } catch (err) {
    console.error(`[Calls] Could not save call ${callSid}:`, err.message);
    return null;
  }
}

const REASON_TEXT = {
  at_capacity: 'the agent was on its maximum number of calls',
  agent_disabled: 'the agent was switched off',
  agent_dropped: 'the agent disconnected',
  agent_requested: 'the agent handed the caller over',
  caller_pressed_0: 'the caller pressed 0 for a person',
};

function describeWithoutSummary(s, outcome) {
  const reason = (s.forwardReason || '').replace(/_unanswered$/, '');
  const why = REASON_TEXT[reason];
  if (outcome === 'forwarded') {
    return `${why ? `Forwarded because ${why}. ` : ''}${s.forwardedTo ? `Answered by ${s.forwardedTo}.` : 'No one answered.'}`;
  }
  if (outcome === 'missed') {
    return why ? `Forwarded because ${why}, but no one answered.` : 'Caller hung up before speaking.';
  }
  return null;
}

module.exports = { finalizeCall };
