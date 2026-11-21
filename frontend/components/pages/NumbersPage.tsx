'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Phone, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Loading, Notice, PageHeader } from '@/components/ui';

type PoolNumber = {
  number: string;
  label: string;
  status: string;
  priority: number;
  callsHandled: number;
};

export default function NumbersPage() {
  const { data, setData, error, loading, reload } = useApi<{ numbers: PoolNumber[] }>('/api/ved/numbers');
  const numbers = data?.numbers ?? [];
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ numbers: PoolNumber[] }>) => {
    setBusy(key);
    setActionError(null);
    try {
      const res = await fn();
      setData({ numbers: res.numbers });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...numbers];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    run(`move:${item.number}`, () =>
      api('/api/ved/numbers/order', {
        method: 'POST',
        body: JSON.stringify({ orderedNumbers: next.map((n) => n.number) }),
      })
    );
  };

  const remove = (n: PoolNumber) => {
    if (!window.confirm(`Remove ${n.number}?`)) return;
    run(`remove:${n.number}`, () => api(`/api/ved/numbers/${encodeURIComponent(n.number)}`, { method: 'DELETE' }));
  };

  return (
    <>
      <PageHeader
        title="Numbers"
        description="The helpline number and the numbers calls are forwarded to, in the order they are tried."
      />

      <div className="mb-4">
        <Notice tone="amber">
          Forwarding is not live yet. It arrives with the Plivo number: when the agent is busy or offline, calls ring
          these numbers top to bottom, moving on if a line is busy or unanswered.
        </Notice>
      </div>

      {(error || actionError) && (
        <div className="mb-4">
          <Notice onRetry={error ? reload : undefined}>{error || actionError}</Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <Card title="Order" bodyClassName="p-0">
          {loading && !data ? (
            <Loading />
          ) : numbers.length === 0 ? (
            <EmptyState icon={Phone} title="No numbers" description="Add the helpline number first, then forwarding numbers." />
          ) : (
            <ol className="divide-y divide-zinc-100">
              {numbers.map((n, i) => (
                <li key={n.number} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 text-xs text-zinc-400 tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 tabular-nums">{n.number}</span>
                      {i === 0 ? <Badge tone="blue">Helpline</Badge> : <Badge>Forward {i}</Badge>}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">
                      {n.label} · {n.callsHandled} {n.callsHandled === 1 ? 'call' : 'calls'}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <IconButton icon={ArrowUp} label="Move up" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} />
                    <IconButton
                      icon={ArrowDown}
                      label="Move down"
                      disabled={i === numbers.length - 1 || !!busy}
                      onClick={() => move(i, 1)}
                    />
                    <IconButton
                      icon={Trash2}
                      label={`Remove ${n.number}`}
                      disabled={!!busy}
                      onClick={() => remove(n)}
                      className="hover:text-red-600 hover:bg-red-50"
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <AddNumberCard
          onAdded={(list) => setData({ numbers: list })}
          disabled={!!busy}
        />
      </div>
    </>
  );
}

function AddNumberCard({ onAdded, disabled }: { onAdded: (n: PoolNumber[]) => void; disabled: boolean }) {
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ numbers: PoolNumber[] }>('/api/ved/numbers', {
        method: 'POST',
        body: JSON.stringify({ number: number.trim(), label: label.trim() || undefined }),
      });
      onAdded(res.numbers);
      setNumber('');
      setLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Add number">
      <form onSubmit={add} className="space-y-4">
        {error && <Notice>{error}</Notice>}
        <Field label="Phone number" htmlFor="new-number" hint="Full number with country code.">
          <Input
            id="new-number"
            type="tel"
            inputMode="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+91"
            required
          />
        </Field>
        <Field label="Label" htmlFor="new-label">
          <Input
            id="new-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Admissions office"
          />
        </Field>
        <Button type="submit" variant="primary" loading={saving} disabled={disabled || !number.trim()}>
          Add number
        </Button>
      </form>
    </Card>
  );
}
