'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ListOrdered, Search } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatDateTime, formatDuration, secondsBetween } from '@/lib/format';
import { Badge, Button, Card, EmptyState, Input, Loading, Notice, PageHeader } from '@/components/ui';

type Turn = { speaker: 'user' | 'ai'; text: string };

type CallRecord = {
  id: string;
  phone: string | null;
  summary: string | null;
  intent: string | null;
  resolution_status: string | null;
  createdAt: string;
  callData?: {
    transcript?: Turn[];
    resolution?: string;
    startTime?: string;
    endTime?: string;
  } | null;
};

export function outcomeOf(c: { resolution_status?: string | null; callData?: { resolution?: string } | null }) {
  return (c.resolution_status || c.callData?.resolution || '').toLowerCase();
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === 'resolved') return <Badge tone="green">Resolved</Badge>;
  if (outcome === 'escalated') return <Badge tone="amber">Escalated</Badge>;
  if (outcome === 'unresolved' || outcome === 'follow_up_needed') return <Badge tone="red">Unresolved</Badge>;
  return <Badge>Unknown</Badge>;
}

export default function CallLogPage() {
  const { data, error, loading, reload } = useApi<CallRecord[]>('/analytics');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.phone, c.intent, c.summary].some((v) => v?.toLowerCase().includes(q))
    );
  }, [data, query]);

  return (
    <>
      <PageHeader
        title="Call log"
        description="Every completed call with its summary and transcript."
        actions={
          <Button size="sm" onClick={reload} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      <Card bodyClassName="p-0">
        <div className="px-4 py-3 border-b border-zinc-200">
          <div className="relative max-w-sm">
            <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by number, topic or summary"
              className="pl-9"
              aria-label="Search calls"
            />
          </div>
        </div>

        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title={query ? 'No calls match your search' : 'No calls recorded yet'}
            description={query ? undefined : 'Calls are saved here after they end and a summary is generated.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-500 border-b border-zinc-200">
                  <th className="w-8" />
                  <th className="px-3 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Caller</th>
                  <th className="px-3 py-2.5 font-medium">Topic</th>
                  <th className="px-3 py-2.5 font-medium">Outcome</th>
                  <th className="px-3 py-2.5 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const isOpen = open === c.id;
                  const seconds = secondsBetween(c.callData?.startTime, c.callData?.endTime);
                  const transcript = c.callData?.transcript || [];
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setOpen(isOpen ? null : c.id)}
                        className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                      >
                        <td className="pl-3 text-zinc-400">
                          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">{formatDateTime(c.createdAt)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-zinc-900">{c.phone || 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-zinc-700 max-w-[280px] truncate">{c.intent || '—'}</td>
                        <td className="px-3 py-2.5">
                          <OutcomeBadge outcome={outcomeOf(c)} />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                          {seconds !== null ? formatDuration(seconds) : '—'}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-zinc-200 bg-zinc-50/60">
                          <td />
                          <td colSpan={5} className="px-3 py-4">
                            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                              <div>
                                <h3 className="text-xs font-medium text-zinc-500 mb-1.5">Summary</h3>
                                <p className="text-sm text-zinc-800 leading-relaxed">
                                  {c.summary || 'No summary was generated for this call.'}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-xs font-medium text-zinc-500 mb-1.5">Transcript</h3>
                                {transcript.length === 0 ? (
                                  <p className="text-sm text-zinc-500">No transcript stored.</p>
                                ) : (
                                  <ol className="space-y-2 max-h-72 overflow-y-auto pr-2">
                                    {transcript.map((t, i) => (
                                      <li key={i} className="grid grid-cols-[56px_1fr] gap-2 text-sm">
                                        <span className={t.speaker === 'user' ? 'text-zinc-500' : 'text-blue-700'}>
                                          {t.speaker === 'user' ? 'Caller' : 'Agent'}
                                        </span>
                                        <span className="text-zinc-800">{t.text}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
