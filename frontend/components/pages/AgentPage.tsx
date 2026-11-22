'use client';

import React, { useRef, useState } from 'react';
import { PhoneOutgoing, Play, Square } from 'lucide-react';
import { api, BACKEND_URL, getToken } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useSettings, type Settings } from '@/lib/useSettings';
import { Button, Card, Field, Input, Loading, Notice, PageHeader, Textarea, cx } from '@/components/ui';

type Voice = { id: string; name: string; description: string };
type VoiceOptions = { available: boolean; voices: Voice[]; tones: { id: string; label: string }[] };

export default function AgentPage() {
  const { settings, error, saving, save, reload } = useSettings();
  const [saved, setSaved] = useState<string | null>(null);

  const onSave = async (section: string, patch: Partial<Settings>) => {
    setSaved(null);
    if (await save(patch)) setSaved(section);
  };

  return (
    <>
      <PageHeader
        title="Agent"
        description="Who the agent is, how it talks, and how it sounds. Changes apply to the next call."
      />
      {!settings ? (
        <Card>{error ? <Notice onRetry={reload}>{error}</Notice> : <Loading />}</Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
          <div className="space-y-4 min-w-0">
            <TextSettingCard
              key={`persona-${settings.persona}`}
              title="Persona"
              description="Who the agent is: name, role and personality."
              rows={5}
              initial={settings.persona}
              saving={saving}
              saved={saved === 'persona'}
              error={saved === null ? error : null}
              onEdit={() => setSaved(null)}
              onSave={(persona) => onSave('persona', { persona })}
            />
            <ConversationCard
              key={`conv-${settings.greeting}\u0000${settings.systemPrompt}\u0000${settings.closingMessage}\u0000${settings.followUpMessage}`}
              settings={settings}
              saving={saving}
              saved={saved === 'conversation'}
              onEdit={() => setSaved(null)}
              onSave={(patch) => onSave('conversation', patch)}
            />
          </div>
          <div className="space-y-4 min-w-0">
            <VoiceCard
              key={`voice-${settings.voiceId}-${settings.voiceTone}-${settings.voiceSpeed}`}
              settings={settings}
              saving={saving}
              saved={saved === 'voice'}
              onEdit={() => setSaved(null)}
              onSave={(patch) => onSave('voice', patch)}
            />
            <TestCallCard />
          </div>
        </div>
      )}
    </>
  );
}

function TextSettingCard({
  title,
  description,
  rows,
  initial,
  saving,
  saved,
  error,
  onEdit,
  onSave,
}: {
  title: string;
  description: string;
  rows: number;
  initial: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onEdit: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;
  return (
    <Card
      title={title}
      description={description}
      actions={
        <>
          {dirty && <Button size="sm" onClick={() => setValue(initial)}>Discard</Button>}
          <Button size="sm" variant="primary" loading={saving && dirty} disabled={!dirty || !value.trim()} onClick={() => onSave(value)}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && dirty && <Notice>{error}</Notice>}
        {saved && !dirty && <Notice tone="green">Saved.</Notice>}
        <Textarea
          aria-label={title}
          rows={rows}
          value={value}
          onChange={(e) => { setValue(e.target.value); onEdit(); }}
          className="text-[13px]"
        />
      </div>
    </Card>
  );
}

function ConversationCard({
  settings,
  saving,
  saved,
  onEdit,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  saved: boolean;
  onEdit: () => void;
  onSave: (patch: Partial<Settings>) => void;
}) {
  const [greeting, setGreeting] = useState(settings.greeting);
  const [prompt, setPrompt] = useState(settings.systemPrompt);
  const [closing, setClosing] = useState(settings.closingMessage);
  const [followUp, setFollowUp] = useState(settings.followUpMessage);
  const dirty =
    greeting !== settings.greeting ||
    prompt !== settings.systemPrompt ||
    closing !== settings.closingMessage ||
    followUp !== settings.followUpMessage;
  const reset = () => {
    setGreeting(settings.greeting);
    setPrompt(settings.systemPrompt);
    setClosing(settings.closingMessage);
    setFollowUp(settings.followUpMessage);
  };

  return (
    <Card
      title="How it talks"
      description="The opening line and the rules for every reply: language, tone, wording and when to hand over. Facts belong in the knowledge base."
      actions={
        <>
          {dirty && (
            <Button size="sm" onClick={reset}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            loading={saving && dirty}
            disabled={!dirty || !greeting.trim() || !prompt.trim() || !closing.trim() || !followUp.trim()}
            onClick={() => onSave({ greeting, systemPrompt: prompt, closingMessage: closing, followUpMessage: followUp })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {saved && !dirty && <Notice tone="green">Saved. New calls use these instructions.</Notice>}
        <Field label="Greeting" htmlFor="greeting" hint="The first thing callers hear. Keep the recording notice.">
          <Textarea id="greeting" rows={2} value={greeting} onChange={(e) => { setGreeting(e.target.value); onEdit(); }} />
        </Field>
        <Field
          label="Closing greeting"
          htmlFor="closing"
          hint="Said before the agent ends a call: when the caller's question is answered, or when they keep to unrelated talk."
        >
          <Textarea id="closing" rows={2} value={closing} onChange={(e) => { setClosing(e.target.value); onEdit(); }} />
        </Field>
        <Field
          label="When no counsellor is free"
          htmlFor="follow-up"
          hint="Said when the agent cannot answer and nobody on the forwarding list picks up. The question is saved in the call log for follow-up, then the closing greeting plays and the call ends."
        >
          <Textarea id="follow-up" rows={3} value={followUp} onChange={(e) => { setFollowUp(e.target.value); onEdit(); }} />
        </Field>
        <Field label="Instructions" htmlFor="prompt">
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); onEdit(); }}
            rows={18}
            className="font-mono text-[13px]"
          />
        </Field>
        <div className="text-right text-xs text-zinc-500 tabular-nums">{prompt.length.toLocaleString()} characters</div>
      </div>
    </Card>
  );
}

function VoiceCard({
  settings,
  saving,
  saved,
  onEdit,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  saved: boolean;
  onEdit: () => void;
  onSave: (patch: Partial<Settings>) => void;
}) {
  const { data: options, error } = useApi<VoiceOptions>('/api/voices');
  const [voiceId, setVoiceId] = useState(settings.voiceId);
  const [tone, setTone] = useState(settings.voiceTone);
  const [speed, setSpeed] = useState(settings.voiceSpeed);
  const [previewing, setPreviewing] = useState<'loading' | 'playing' | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const dirty = voiceId !== settings.voiceId || tone !== settings.voiceTone || speed !== settings.voiceSpeed;
  const edit = () => { onEdit(); setPreviewError(null); };

  const stop = () => {
    audio.current?.pause();
    setPreviewing(null);
  };

  const preview = async () => {
    if (previewing) return stop();
    setPreviewing('loading');
    setPreviewError(null);
    try {
      // Audio comes back as a file, so this request is made directly rather than through api().
      const res = await fetch(`${BACKEND_URL}/api/voices/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() || ''}` },
        body: JSON.stringify({ voiceId, voiceTone: tone, voiceSpeed: speed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Preview failed (${res.status})`);
      }
      const url = URL.createObjectURL(await res.blob());
      audio.current?.pause();
      audio.current = new Audio(url);
      audio.current.onended = () => { setPreviewing(null); URL.revokeObjectURL(url); };
      await audio.current.play();
      setPreviewing('playing');
    } catch (err) {
      setPreviewing(null);
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  return (
    <Card
      title="Voice"
      description="Used for every reply and for the hold and busy messages."
      actions={
        <>
          {dirty && (
            <Button size="sm" onClick={() => { setVoiceId(settings.voiceId); setTone(settings.voiceTone); setSpeed(settings.voiceSpeed); }}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            loading={saving && dirty}
            disabled={!dirty}
            onClick={() => onSave({ voiceId, voiceTone: tone, voiceSpeed: speed })}
          >
            Save
          </Button>
        </>
      }
    >
      {!options ? (
        error ? <Notice>{error}</Notice> : <Loading />
      ) : (
        <div className="space-y-5">
          {!options.available && (
            <Notice tone="amber">ElevenLabs is not configured on the backend, so calls use the basic Google voice.</Notice>
          )}
          {saved && !dirty && <Notice tone="green">Saved. The greeting and messages are being regenerated.</Notice>}

          <fieldset>
            <legend className="text-[13px] font-medium text-zinc-700 mb-1.5">Voice type</legend>
            <div className="space-y-1.5">
              {options.voices.map((v) => (
                <label
                  key={v.id}
                  className={cx(
                    'flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer',
                    voiceId === v.id ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-200 hover:bg-zinc-50'
                  )}
                >
                  <input
                    type="radio"
                    name="voice"
                    value={v.id}
                    checked={voiceId === v.id}
                    onChange={() => { setVoiceId(v.id); edit(); }}
                    className="mt-1 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900">
                      {v.name}
                      {v.id === 'PqovzlPXjFmB5NRVvFVe' && <span className="ml-1.5 text-xs font-normal text-zinc-500">default</span>}
                    </span>
                    <span className="block text-xs text-zinc-500">{v.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-medium text-zinc-700 mb-1.5">Tone</legend>
            <div className="inline-flex rounded-md border border-zinc-300 p-0.5" role="radiogroup">
              {options.tones.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tone === t.id}
                  onClick={() => { setTone(t.id); edit(); }}
                  className={cx(
                    'h-8 px-3 rounded text-[13px] font-medium cursor-pointer',
                    tone === t.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Calm is steady and even; expressive varies pitch and emphasis more.</p>
          </fieldset>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="speed" className="text-[13px] font-medium text-zinc-700">Speed</label>
              <span className="text-[13px] tabular-nums text-zinc-700">{speed.toFixed(2)}×</span>
            </div>
            <input
              id="speed"
              type="range"
              min={0.7}
              max={1.2}
              step={0.05}
              value={speed}
              onChange={(e) => { setSpeed(Number(e.target.value)); edit(); }}
              className="mt-2 w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-zinc-500"><span>Slower</span><span>Faster</span></div>
          </div>

          {previewError && <Notice>{previewError}</Notice>}
          <Button
            icon={previewing === 'playing' ? Square : Play}
            loading={previewing === 'loading'}
            onClick={preview}
            disabled={!options.available}
          >
            {previewing === 'playing' ? 'Stop' : 'Hear the greeting'}
          </Button>
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
          <Input id="test-number" type="tel" inputMode="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+91" required />
        </Field>
        {result && <Notice tone={result.tone}>{result.text}</Notice>}
        <Button type="submit" variant="primary" icon={PhoneOutgoing} loading={calling} disabled={!number.trim()}>
          Call now
        </Button>
      </form>
    </Card>
  );
}
