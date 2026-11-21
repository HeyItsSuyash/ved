'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhoneForwarded, PhoneIncoming } from 'lucide-react';
import { api, liveSocketUrl } from '@/lib/api';
import { formatClock, formatPhone, formatTime } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { Badge, Card, EmptyState, Notice, PageHeader, StatusDot, cx } from '@/components/ui';

type Turn = { speaker: 'user' | 'ai'; text: string; timestamp?: string; language?: string };

type Session = {
  callSid: string;
  phoneNumber?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  outcome?: string;
  forwardedTo?: string;
  turns: Turn[];
};

function isActive(s: Session) {
  return !s.endTime && s.status !== 'ended';
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

type ForwardingNumber = { id: string; number: string; label: string; active: boolean; verified: boolean };

/** The numbers callers dial and the numbers their calls can be forwarded to. */
function NumbersStrip({ helpline, onManage }: { helpline: string | null; onManage: () => void }) {
  const { data } = useApi<{ numbers: ForwardingNumber[] }>('/api/forwarding');
  const ringing = (data?.numbers ?? []).filter((n) => n.active && n.verified);
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] mb-4">
      <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3.5">
        <div className="text-[13px] text-zinc-500">Helpline number</div>
        <div className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums">
          {helpline ? formatPhone(helpline) : <span className="text-base font-normal text-zinc-500">Not set</span>}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">Callers dial this; the agent answers.</div>
      </div>
      <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] text-zinc-500">Forwarded to, in order</div>
          <button onClick={onManage} className="text-[13px] font-medium text-blue-700 hover:underline cursor-pointer">
            Manage
          </button>
        </div>
        {ringing.length === 0 ? (
          <div className="mt-1.5 flex items-center gap-2 text-sm text-amber-800">
            <PhoneForwarded className="size-4" />
            No verified staff numbers. Callers who need a person cannot be forwarded.
          </div>
        ) : (
          <ol className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
            {ringing.map((n, i) => (
              <li key={n.id} className="text-sm text-zinc-900">
                <span className="text-zinc-400 tabular-nums mr-1.5">{i + 1}</span>
                <span className="tabular-nums font-medium">{formatPhone(n.number)}</span>
                {n.label && <span className="text-zinc-500"> · {n.label}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function LivePage({ helpline, onManageForwarding }: { helpline: string | null; onManageForwarding: () => void }) {
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [loadError, setLoadError] = useState<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  // Initial snapshot of sessions held in backend memory.
  useEffect(() => {
    api<Session[]>('/calls')
      .then((calls) => {
        const map: Record<string, Session> = {};
        for (const c of calls) map[c.callSid] = { ...c, turns: c.turns || [] };
        setSessions(map);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  // Live updates.
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      setSocketState('connecting');
      socket = new WebSocket(liveSocketUrl());
      socket.onopen = () => setSocketState('open');
      socket.onclose = () => {
        setSocketState('closed');
        if (!closed) retry = setTimeout(connect, 3000);
      };
      socket.onmessage = (msg) => {
        let payload: { event: string; data: { callSid: string; updates?: Partial<Session>; turn?: Turn } };
        try {
          payload = JSON.parse(msg.data);
        } catch {
          return;
        }
        const { event, data } = payload;
        if (!data?.callSid) return;

        setSessions((prev) => {
          const current: Session = prev[data.callSid] || { callSid: data.callSid, turns: [] };
          if (event === 'call_updated' && data.updates) {
            const { turns, ...rest } = data.updates;
            return { ...prev, [data.callSid]: { ...current, ...rest, turns: turns ?? current.turns } };
          }
          if (event === 'turn_added' && data.turn) {
            return { ...prev, [data.callSid]: { ...current, turns: [...current.turns, data.turn] } };
          }
          if (event === 'call_ended') {
            return {
              ...prev,
              [data.callSid]: { ...current, status: 'ended', endTime: current.endTime || new Date().toISOString() },
            };
          }
          return prev;
        });
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, []);

  const ordered = useMemo(() => {
    return Object.values(sessions).sort((a, b) => {
      if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1;
      return new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime();
    });
  }, [sessions]);

  const activeCount = ordered.filter(isActive).length;
  const now = useNow(activeCount > 0);

  // Follow the newest active call unless the user picked one.
  const current = (selected && sessions[selected]) || ordered[0] || null;

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'end' });
  }, [current?.turns.length]);

  return (
    <>
      <PageHeader
        title="Live calls"
        description="Conversations appear here as they happen."
        actions={
          <span className="inline-flex items-center gap-2 text-[13px] text-zinc-600">
            <StatusDot tone={socketState === 'open' ? 'green' : socketState === 'connecting' ? 'amber' : 'red'} />
            {socketState === 'open' ? 'Connected' : socketState === 'connecting' ? 'Connecting' : 'Disconnected, retrying'}
          </span>
        }
      />

      <NumbersStrip helpline={helpline} onManage={onManageForwarding} />

      {loadError && (
        <div className="mb-4">
          <Notice>{loadError}</Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card
          title="Calls"
          description={activeCount ? `${activeCount} in progress` : 'None in progress'}
          bodyClassName="p-0"
        >
          {ordered.length === 0 ? (
            <EmptyState
              icon={PhoneIncoming}
              title="No calls yet"
              description="Calls since the backend last started are listed here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[520px] overflow-y-auto">
              {ordered.map((s) => {
                const active = isActive(s);
                const isCurrent = current?.callSid === s.callSid;
                return (
                  <li key={s.callSid}>
                    <button
                      onClick={() => setSelected(s.callSid)}
                      className={cx(
                        'w-full text-left px-4 py-3 flex items-center justify-between gap-3 cursor-pointer',
                        isCurrent ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 tabular-nums truncate">
                          {s.phoneNumber && s.phoneNumber !== 'unknown' ? s.phoneNumber : 'Unknown caller'}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {formatTime(s.startTime)} · {s.turns.length} {s.turns.length === 1 ? 'turn' : 'turns'}
                        </div>
                      </div>
                      {s.outcome === 'forwarded' ? (
                        <Badge tone="amber">{active ? 'Forwarding' : 'Forwarded'}</Badge>
                      ) : active ? (
                        <Badge tone="blue">Live</Badge>
                      ) : (
                        <Badge>Ended</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title={current ? (current.phoneNumber && current.phoneNumber !== 'unknown' ? current.phoneNumber : 'Unknown caller') : 'Transcript'}
          description={
            current
              ? isActive(current)
                ? `In progress · ${formatClock((now - new Date(current.startTime || now).getTime()) / 1000)}`
                : `Ended · started ${formatTime(current.startTime)}`
              : undefined
          }
          bodyClassName="p-0"
        >
          <div className="h-[520px] overflow-y-auto px-5 py-4">
            {!current ? (
              <EmptyState
                title="Waiting for a call"
                description={helpline ? `Dial ${formatPhone(helpline)} to test the agent.` : undefined}
              />
            ) : current.turns.length === 0 ? (
              <EmptyState title="Listening" description="The transcript starts when the caller speaks." />
            ) : (
              <ol className="space-y-4">
                {current.turns.map((t, i) => (
                  <li key={i} className="grid grid-cols-[64px_1fr] gap-3">
                    <span
                      className={cx(
                        'text-xs font-medium pt-0.5',
                        t.speaker === 'user' ? 'text-zinc-500' : 'text-blue-700'
                      )}
                    >
                      {t.speaker === 'user' ? 'Caller' : 'Agent'}
                    </span>
                    <p className="text-sm text-zinc-800 leading-relaxed">{t.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <div ref={transcriptEnd} />
          </div>
        </Card>
      </div>
    </>
  );
}
