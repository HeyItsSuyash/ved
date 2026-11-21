'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatDuration } from '@/lib/format';
import { Button, Card, EmptyState, Loading, Notice, PageHeader, Stat } from '@/components/ui';

type Insights = {
  totalCalls: number;
  totalSeconds: number;
  avgSeconds: number;
  successRate: number;
  outcomes: {
    resolved: number;
    unresolved?: number;
    in_progress: number;
    follow_up_needed: number;
    escalated: number;
  };
  faqs: { question: string; count: number }[];
};

const OUTCOME_ROWS: { key: keyof Insights['outcomes']; label: string; color: string }[] = [
  { key: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { key: 'unresolved', label: 'Unresolved', color: 'bg-red-400' },
  { key: 'escalated', label: 'Escalated', color: 'bg-amber-400' },
  { key: 'follow_up_needed', label: 'Needs follow-up', color: 'bg-zinc-400' },
  { key: 'in_progress', label: 'In progress', color: 'bg-blue-600' },
];

export default function InsightsPage() {
  const { data, error, loading, reload } = useApi<Insights>('/api/ved/insights');

  return (
    <>
      <PageHeader
        title="Insights"
        description="How calls are going and what callers ask most."
        actions={<Button size="sm" onClick={reload} loading={loading && !!data}>Refresh</Button>}
      />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !data ? (
        <Loading />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label="Calls" value={data.totalCalls} />
            <Stat label="Resolved by agent" value={`${data.successRate}%`} detail={`${data.outcomes.resolved} of ${data.totalCalls}`} />
            <Stat label="Average call" value={formatDuration(data.avgSeconds)} />
            <Stat label="Total talk time" value={formatDuration(data.totalSeconds)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Card title="Outcomes">
              {data.totalCalls === 0 ? (
                <EmptyState icon={BarChart3} title="No calls yet" />
              ) : (
                <ul className="space-y-3.5">
                  {OUTCOME_ROWS.map(({ key, label, color }) => {
                    const count = data.outcomes[key] ?? 0;
                    const pct = data.totalCalls ? Math.round((count / data.totalCalls) * 100) : 0;
                    return (
                      <li key={key}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-zinc-700">{label}</span>
                          <span className="tabular-nums text-zinc-900">
                            {count} <span className="text-zinc-400 text-xs">{pct}%</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Most asked" description="Caller questions, most frequent first." bodyClassName="p-0">
              {data.faqs.length === 0 ? (
                <EmptyState title="No questions recorded yet" description="Questions appear once calls have transcripts." />
              ) : (
                <ol className="divide-y divide-zinc-100">
                  {data.faqs.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3">
                      <span className="w-5 shrink-0 text-xs text-zinc-400 tabular-nums pt-0.5">{i + 1}</span>
                      <span className="flex-1 text-sm text-zinc-800">{f.question}</span>
                      <span className="text-xs text-zinc-500 tabular-nums shrink-0 pt-0.5">
                        {f.count}×
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
