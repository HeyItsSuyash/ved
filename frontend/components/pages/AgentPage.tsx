'use client';

import React, { useState } from 'react';
import { PhoneOutgoing } from 'lucide-react';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { Button, Card, Field, Input, Loading, Notice, PageHeader, Textarea } from '@/components/ui';

export default function AgentPage() {
  return (
    <>
      <PageHeader title="Agent" description="What the agent says first, the rules it follows on every call, and a way to test it." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <InstructionsCard />
        <TestCallCard />
      </div>
    </>
  );
}

function InstructionsCard() {
  const { settings, error, saving, save, reload } = useSettings();
  const [saved, setSaved] = useState(false);

  if (!settings) {
    return (
      <Card title="Instructions">{error ? <Notice onRetry={reload}>{error}</Notice> : <Loading />}</Card>
    );
  }
  return (
    <InstructionsForm
      key={`${settings.greeting}\u0000${settings.systemPrompt}`}
      initialGreeting={settings.greeting}
      initialPrompt={settings.systemPrompt}
      error={error}
      saving={saving}
      saved={saved}
      onEdit={() => setSaved(false)}
      onSave={async (greeting, systemPrompt) => setSaved(await save({ greeting, systemPrompt }))}
    />
  );
}

function InstructionsForm({
  initialGreeting,
  initialPrompt,
  error,
  saving,
  saved,
  onEdit,
  onSave,
}: {
  initialGreeting: string;
  initialPrompt: string;
  error: string | null;
  saving: boolean;
  saved: boolean;
  onEdit: () => void;
  onSave: (greeting: string, prompt: string) => Promise<void>;
}) {
  const [greeting, setGreeting] = useState(initialGreeting);
  const [prompt, setPrompt] = useState(initialPrompt);
  const dirty = greeting !== initialGreeting || prompt !== initialPrompt;

  return (
    <Card
      title="Instructions"
      description="Persona, tone, language and limits. Facts belong in the knowledge base."
      actions={
        <>
          {dirty && (
            <Button size="sm" onClick={() => { setGreeting(initialGreeting); setPrompt(initialPrompt); }}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => onSave(greeting, prompt)}
            loading={saving}
            disabled={!dirty || !greeting.trim() || !prompt.trim()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Notice>{error}</Notice>}
        {saved && !dirty && <Notice tone="green">Saved. New calls use these instructions.</Notice>}
        <Field label="Greeting" htmlFor="greeting" hint="The first thing callers hear.">
          <Input id="greeting" value={greeting} onChange={(e) => { setGreeting(e.target.value); onEdit(); }} />
        </Field>
        <Field label="Instructions" htmlFor="prompt">
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); onEdit(); }}
            rows={20}
            className="font-mono text-[13px]"
          />
        </Field>
        <div className="text-right text-xs text-zinc-500 tabular-nums">{prompt.length.toLocaleString()} characters</div>
      </div>
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
      await api('/api/test-call', { method: 'POST', body: JSON.stringify({ to: number.trim() }) });
      setResult({ tone: 'green', text: `Calling ${number.trim()}. Answer and talk to the agent; follow it on Live calls.` });
    } catch (err) {
      setResult({ tone: 'red', text: err instanceof Error ? err.message : 'Call failed' });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Card title="Test call" description="The helpline calls this phone and the agent answers.">
      <form onSubmit={call} className="space-y-4">
        <Field label="Phone number" htmlFor="test-number" hint="An Indian mobile, e.g. +91 98765 43210.">
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
