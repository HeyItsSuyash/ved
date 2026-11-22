'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';

// The backend sleeps when idle and takes up to a minute to start. Until /health
// answers, show a loader instead of a dashboard full of failing requests.
const POLL_MS = 2500;
const REQUEST_TIMEOUT_MS = 8000;
const SHOW_LOADER_AFTER_MS = 700; // an awake backend answers sooner: no loader flash
const AWAKE_KEY = 'ved_backend_awake_at';
const AWAKE_TTL_MS = 10 * 60 * 1000;

// Seen awake recently in this tab: connect straight away instead of waiting on a check.
function recentlyAwake(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(AWAKE_KEY) || 0) < AWAKE_TTL_MS;
  } catch {
    return false;
  }
}

function markAwake() {
  try {
    sessionStorage.setItem(AWAKE_KEY, String(Date.now()));
  } catch {
    // storage unavailable: the next load simply checks again
  }
}

let awake = false; // once awake, later page loads in this tab skip the wait

type Health = 'ok' | 'blocked' | 'down';

// 'blocked': the server is up but its DASHBOARD_ORIGIN does not include this dashboard's address,
// so the browser would refuse every API response.
async function ping(): Promise<Health> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return 'down';
    const body = await res.json().catch(() => null);
    return body?.originAllowed === false ? 'blocked' : 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export default function BackendGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(awake);
  const [seconds, setSeconds] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (ready) {
      // Already connected: refresh the timestamp in the background, no waiting.
      ping().then((h) => h === 'ok' && markAwake());
      return;
    }
    let stopped = false;
    if (recentlyAwake()) {
      // Seen awake in the last few minutes: connect straight away, re-check in the background.
      Promise.resolve().then(() => !stopped && setReady(true));
      return () => {
        stopped = true;
      };
    }
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    const reveal = setTimeout(() => setShowLoader(true), SHOW_LOADER_AFTER_MS);

    (async () => {
      while (!stopped) {
        const health = await ping();
        if (health === 'ok') {
          awake = true;
          markAwake();
          if (!stopped) setReady(true);
          return;
        }
        if (!stopped) {
          setBlocked(health === 'blocked');
          if (health === 'blocked') setShowLoader(true);
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    })();

    return () => {
      stopped = true;
      clearInterval(tick);
      clearTimeout(reveal);
    };
  }, [ready]);

  if (ready) return <>{children}</>;
  if (!showLoader) return <div className="min-h-screen bg-zinc-50" />;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/Madan_Mohan_Malaviya_University_of_Technology_logo.png"
          alt="Madan Mohan Malaviya University of Technology"
          width={48}
          height={48}
          priority
          className="mx-auto"
        />
        <div className="mt-4 text-sm font-semibold text-zinc-900">Admission &amp; Counselling Support</div>
        <div className="text-[13px] text-zinc-500">Admin panel</div>

        {blocked ? (
          <div
            className="mt-8 text-left text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-3"
            role="alert"
          >
            <p className="font-medium">The helpline server is running but does not accept this address.</p>
            <p className="mt-1.5">
              On the backend service, add{' '}
              <code className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}</code> to{' '}
              <code className="font-mono">DASHBOARD_ORIGIN</code> (comma-separated, no trailing slash) and redeploy.
              This page connects by itself once that is done.
            </p>
          </div>
        ) : (
          <>
            <div
              className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-700"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin text-blue-600" />
              {seconds < 5 ? 'Connecting to the helpline server' : 'Starting the helpline server'}
            </div>
            <p className="mt-2 text-[13px] text-zinc-500">
              {seconds < 5
                ? 'One moment.'
                : `After a quiet period the server takes up to a minute to start. Waiting ${seconds}s.`}
            </p>
            {seconds >= 90 && (
              <p className="mt-4 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                This is taking longer than usual. Still trying; check that the backend service is running and that{' '}
                <code className="font-mono">NEXT_PUBLIC_BACKEND_URL</code> points to it.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
