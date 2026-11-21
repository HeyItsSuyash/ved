'use client';

import { useState } from 'react';
import { api } from './api';
import { useApi } from './useApi';

export type Settings = {
  systemPrompt: string;
  greeting: string;
  unavailableMessage: string;
  agentEnabled: boolean;
  maxConcurrentCalls: number;
  forwardTimeoutSeconds: number;
};

/** Agent and routing settings, with a save that returns whether it worked. */
export function useSettings() {
  const { data, setData, error: loadError, reload } = useApi<Settings>('/api/settings');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    setSaveError(null);
    try {
      setData(await api<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }));
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { settings: data, error: saveError || loadError, saving, save, reload };
}
