'use client';

import React, { useEffect, useState } from 'react';
import { PhoneOutgoing } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Button, Card, Field, Input, Loading, Notice, PageHeader, Textarea } from '@/components/ui';

export default function AgentPage() {
  return (
    <>
      <PageHeader
        title="Agent"
        description="Instructions the agent follows on every call, and a way to test it."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <InstructionsCard />
        <TestCallCard />
      </div>
    </>
  );
}

function InstructionsCard() {
  const { data, error, loading, reload } = useApi<{ prompt: string }>('/api/ved/prompt');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  useEffect(() => {
    if (data?.prompt !== undefined) setDraft(data.prompt);
  }, [data?.prompt]);

  const dirty = data ? draft !== data.prompt : false;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await api('/api/ved/prompt', { method: 'POST', body: JSON.stringify({ prompt: draft }) });
      await reload();
      setStatus({ tone: 'green', text: 'Saved. New calls use these instructions.' });
    } catch (err) {
      setStatus({ tone: 'red', text: err instanceof Error ? err.message : 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Instructions"
      description="Persona, tone, language and limits. Facts belong in the knowledge base."
      actions={
        <>
          {dirty && (
            <Button size="sm" onClick={() => setDraft(data?.prompt ?? '')}>
              Discard
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!dirty || !draft.trim()}>
            Save
          </Button>
        </>
      }
    >
      {error ? (
        <Notice onRetry={reload}>{error}</Notice>
      ) : loading && !data ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {status && <Notice tone={status.tone}>{status.text}</Notice>}
          <Textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setStatus(null); }}
            rows={22}
            className="font-mono text-[13px]"
            aria-label="Agent instructions"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Stored in backend memory: a backend restart restores the default.</span>
            <span className="tabular-nums">{draft.length.toLocaleString()} characters</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function TestCallCard() {
  const [number, setNumber] = useState('');
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  const call = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalling(true);
    setResult(null);
    try {
      const res = await api<{ callSid: string; provider?: string }>('/call/outbound', {
        method: 'POST',
        body: JSON.stringify({ to: number.trim() }),
      });
      setResult({
        tone: 'green',
        text: `Calling ${number.trim()}${res.provider ? ` via ${res.provider}` : ''}. Follow it on the Live calls page.`,
      });
    } catch (err) {
      setResult({ tone: 'red', text: err instanceof Error ? err.message : 'Call failed' });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Card title="Test call" description="The agent calls this number so you can talk to it.">
      <form onSubmit={call} className="space-y-4">
        <Field label="Phone number" htmlFor="test-number" hint="Include the country code, e.g. +91 98765 43210.">
          <Input
            id="test-number"
            type="tel"
            inputMode="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+91"
            required
          />
        </Field>
        {result && <Notice tone={result.tone}>{result.text}</Notice>}
        <Button type="submit" variant="primary" icon={PhoneOutgoing} loading={calling} disabled={!number.trim()}>
          Call now
        </Button>
      </form>
    </Card>
  );
}
