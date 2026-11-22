'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, PhoneCall, PhoneForwarded, Trash2 } from 'lucide-react';
import { formatPhone } from '@/lib/format';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useSettings, type Settings } from '@/lib/useSettings';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Loading,
  Notice,
  PageHeader,
  Switch,
  Textarea,
} from '@/components/ui';

type ForwardingNumber = {
  id: string;
  number: string;
  label: string;
  position: number;
  active: boolean;
  verified: boolean;
  codePending: boolean;
};
type TelephonyStatus = { provider: string; helpline: string | null; plivoConfigured: boolean; activeAgentCalls: number };

export default function ForwardingPage() {
  return (
    <>
      <PageHeader
        title="Forwarding"
        description="When a caller wants to speak to a person, the agent cannot clear a doubt, or the agent is busy or off, these numbers ring one at a time, top to bottom. A busy or unanswered number moves on to the next."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
        <NumbersCard />
        <RoutingCard />
      </div>
    </>
  );
}

function NumbersCard() {
  const { data, setData, error, loading, reload } = useApi<{ numbers: ForwardingNumber[] }>('/api/forwarding');
  const numbers = data?.numbers ?? [];
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ numbers: ForwardingNumber[] }>) => {
    setBusy(true);
    setActionError(null);
    try {
      setData({ numbers: (await fn()).numbers });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const ids = numbers.map((n) => n.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    run(() => api('/api/forwarding/order', { method: 'POST', body: JSON.stringify({ ids }) }));
  };

  const ringingCount = numbers.filter((n) => n.active && n.verified).length;

  return (
    <Card
      title="Staff numbers"
      description={
        numbers.length
          ? `${ringingCount} of ${numbers.length} will ring. Only numbers verified with a code receive calls.`
          : 'Only numbers verified with a code receive calls.'
      }
      bodyClassName="p-0"
    >
      {(error || actionError) && (
        <div className="px-5 pt-4">
          <Notice onRetry={error ? reload : undefined}>{error || actionError}</Notice>
        </div>
      )}
      {loading && !data ? (
        <Loading />
      ) : numbers.length === 0 ? (
        <EmptyState
          icon={PhoneForwarded}
          title="No staff numbers"
          description="Without one, callers who cannot reach the agent hear the closing message and the call ends."
        />
      ) : (
        <ol className="divide-y divide-zinc-100">
          {numbers.map((n, i) => (
            <li key={n.id} className="px-5 py-3">
              <div className="flex items-center gap-4">
                <span className="w-5 text-xs text-zinc-400 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium tabular-nums ${n.active && n.verified ? 'text-zinc-900' : 'text-zinc-500'}`}>
                      {formatPhone(n.number)}
                    </span>
                    {n.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Not verified</Badge>}
                    {!n.active && <Badge>Off</Badge>}
                  </div>
                  {n.label && <div className="text-xs text-zinc-500 mt-0.5 truncate">{n.label}</div>}
                </div>
                <Switch
                  checked={n.active}
                  label={n.active ? `Stop ringing ${n.number}` : `Ring ${n.number}`}
                  disabled={busy}
                  onChange={(active) =>
                    run(() => api(`/api/forwarding/${n.id}`, { method: 'PATCH', body: JSON.stringify({ active }) }))
                  }
                />
                <div className="flex items-center gap-0.5">
                  <IconButton icon={ArrowUp} label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)} />
                  <IconButton icon={ArrowDown} label="Move down" disabled={i === numbers.length - 1 || busy} onClick={() => move(i, 1)} />
                  <IconButton
                    icon={Trash2}
                    label={`Remove ${n.number}`}
                    disabled={busy}
                    className="hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm(`Remove ${n.number}?`)) run(() => api(`/api/forwarding/${n.id}`, { method: 'DELETE' }));
                    }}
                  />
                </div>
              </div>
              {!n.verified && (
                <VerifyRow
                  number={n}
                  disabled={busy}
                  onSend={() => run(() => api(`/api/forwarding/${n.id}/send-code`, { method: 'POST' }))}
                  onVerify={(code) =>
                    api<{ numbers: ForwardingNumber[] }>(`/api/forwarding/${n.id}/verify`, {
                      method: 'POST',
                      body: JSON.stringify({ code }),
                    }).then((res) => setData({ numbers: res.numbers }))
                  }
                />
              )}
            </li>
          ))}
        </ol>
      )}
      <AddNumberForm disabled={busy} onAdded={(list) => setData({ numbers: list })} />
    </Card>
  );
}

/** Verify a staff number: Plivo calls it and reads out a 6-digit code. */
function VerifyRow({
  number,
  disabled,
  onSend,
  onVerify,
}: {
  number: ForwardingNumber;
  disabled: boolean;
  onSend: () => void;
  onVerify: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify');
    } finally {
      setChecking(false);
    }
  };

  if (!number.codePending) {
    return (
      <div className="mt-2 ml-9 flex flex-wrap items-center gap-3">
        <span className="text-xs text-zinc-500">This number will not ring until it is verified.</span>
        <Button size="sm" icon={PhoneCall} onClick={onSend} disabled={disabled}>
          Call with code
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 ml-9 space-y-2">
      <p className="text-xs text-zinc-600">
        We are calling {formatPhone(number.number)} and reading out a 6-digit code. Enter it here. It expires in 10 minutes.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-36">
        <Input
          aria-label={`Code for ${number.number}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="6-digit code"
          className="tabular-nums tracking-widest"
        />
        </div>
        <Button type="submit" size="sm" variant="primary" loading={checking} disabled={code.length !== 6}>
          Verify
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onSend} disabled={disabled}>
          Call again
        </Button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
}

function AddNumberForm({ onAdded, disabled }: { onAdded: (n: ForwardingNumber[]) => void; disabled: boolean }) {
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ numbers: ForwardingNumber[] }>('/api/forwarding', {
        method: 'POST',
        body: JSON.stringify({ number: number.trim(), label: label.trim() }),
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
    <form onSubmit={add} className="border-t border-zinc-200 px-5 py-4 space-y-3">
      {error && <Notice>{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Phone number" htmlFor="fwd-number">
          <Input
            id="fwd-number"
            type="tel"
            inputMode="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+91 98765 43210"
            required
          />
        </Field>
        <Field label="Label" htmlFor="fwd-label">
          <Input id="fwd-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Admissions office" />
        </Field>
        <Button type="submit" variant="primary" loading={saving} disabled={disabled || !number.trim()}>
          Add
        </Button>
      </div>
    </form>
  );
}

function RoutingCard() {
  const { settings, error, saving, save, reload } = useSettings();
  const status = useApi<TelephonyStatus>('/api/telephony/status');
  const [saved, setSaved] = useState(false);

  if (error && !settings) return <Card title="Routing"><Notice onRetry={reload}>{error}</Notice></Card>;
  if (!settings) return <Card title="Routing"><Loading /></Card>;

  return (
    <RoutingForm
      // Remount with fresh values whenever the saved settings change.
      key={JSON.stringify(settings)}
      settings={settings}
      status={status.data}
      error={error}
      saving={saving}
      saved={saved}
      onSave={async (patch) => setSaved(await save(patch))}
      onEdit={() => setSaved(false)}
    />
  );
}

function RoutingForm({
  settings,
  status,
  error,
  saving,
  saved,
  onSave,
  onEdit,
}: {
  settings: Settings;
  status: TelephonyStatus | null;
  error: string | null;
  saving: boolean;
  saved: boolean;
  onSave: (patch: Partial<Settings>) => Promise<void>;
  onEdit: () => void;
}) {
  const [draft, setDraftState] = useState<Settings>(settings);
  const setDraft = (next: Settings) => {
    setDraftState(next);
    onEdit();
  };

  const dirty =
    draft.agentEnabled !== settings.agentEnabled ||
    draft.maxConcurrentCalls !== settings.maxConcurrentCalls ||
    draft.forwardTimeoutSeconds !== settings.forwardTimeoutSeconds ||
    draft.unavailableMessage !== settings.unavailableMessage ||
    draft.holdMessage !== settings.holdMessage ||
    draft.maxCallsPerHour !== settings.maxCallsPerHour ||
    draft.rateLimitMessage !== settings.rateLimitMessage;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      agentEnabled: draft.agentEnabled,
      maxConcurrentCalls: draft.maxConcurrentCalls,
      forwardTimeoutSeconds: draft.forwardTimeoutSeconds,
      unavailableMessage: draft.unavailableMessage,
      holdMessage: draft.holdMessage,
      maxCallsPerHour: draft.maxCallsPerHour,
      rateLimitMessage: draft.rateLimitMessage,
    });
  };

  const helpline = status?.helpline;

  return (
    <Card title="Routing">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <div className="text-[13px] font-medium text-zinc-700">Helpline number</div>
          <div className="mt-1 text-sm tabular-nums text-zinc-900">
            {helpline ? formatPhone(helpline) : <span className="text-zinc-500">Not set. Add PLIVO_NUMBER to the backend environment.</span>}
          </div>
          {status && (
            <div className="mt-0.5 text-xs text-zinc-500">
              {status.activeAgentCalls} {status.activeAgentCalls === 1 ? 'call' : 'calls'} with the agent now
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-medium text-zinc-700">Agent answers calls</div>
            <div className="text-xs text-zinc-500">Off sends every call straight to staff.</div>
          </div>
          <Switch
            checked={draft.agentEnabled}
            label="Agent answers calls"
            onChange={(agentEnabled) => setDraft({ ...draft, agentEnabled })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Calls at once" htmlFor="max-calls" hint="More are forwarded.">
            <Input
              id="max-calls"
              type="number"
              min={0}
              max={100}
              value={draft.maxConcurrentCalls}
              onChange={(e) => setDraft({ ...draft, maxConcurrentCalls: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ring each number for" htmlFor="ring-time" hint="Seconds, 5 to 120.">
            <Input
              id="ring-time"
              type="number"
              min={5}
              max={120}
              value={draft.forwardTimeoutSeconds}
              onChange={(e) => setDraft({ ...draft, forwardTimeoutSeconds: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field
          label="Calls per number per hour"
          htmlFor="rate-limit"
          hint="Stops one number from calling again and again. 0 turns the limit off."
        >
          <Input
            id="rate-limit"
            type="number"
            min={0}
            max={100}
            value={draft.maxCallsPerHour}
            onChange={(e) => setDraft({ ...draft, maxCallsPerHour: Number(e.target.value) })}
            className="w-28"
          />
        </Field>

        <Field label="When a number is over the limit" htmlFor="rate-limit-message" hint="Played before the call ends.">
          <Textarea
            id="rate-limit-message"
            rows={2}
            value={draft.rateLimitMessage}
            onChange={(e) => setDraft({ ...draft, rateLimitMessage: e.target.value })}
          />
        </Field>

        <Field label="While connecting" htmlFor="hold" hint="Played before staff phones ring. Callers who skip the greeting also hear the recording notice first.">
          <Textarea
            id="hold"
            rows={2}
            value={draft.holdMessage}
            onChange={(e) => setDraft({ ...draft, holdMessage: e.target.value })}
          />
        </Field>

        <Field label="If no one answers" htmlFor="unavailable" hint="Read to the caller before the call ends.">
          <Textarea
            id="unavailable"
            rows={3}
            value={draft.unavailableMessage}
            onChange={(e) => setDraft({ ...draft, unavailableMessage: e.target.value })}
          />
        </Field>

        {error && <Notice>{error}</Notice>}
        {saved && !dirty && <Notice tone="green">Saved. Applies to the next call.</Notice>}

        <div className="flex justify-end gap-2">
          {dirty && (
            <Button type="button" onClick={() => setDraftState(settings)}>
              Discard
            </Button>
          )}
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
