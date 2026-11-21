'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';

// The backend sleeps when idle and takes up to a minute to start. Until /health
// answers, show a loader instead of a dashboard full of failing requests.
const POLL_MS = 2500;
const REQUEST_TIMEOUT_MS = 8000;
let awake = false; // once awake, later page loads in this tab skip the wait

async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function BackendGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(awake);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (ready) return;
    let stopped = false;
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);

    (async () => {
      while (!stopped) {
        if (await ping()) {
          awake = true;
          if (!stopped) setReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    })();

    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [ready]);

  if (ready) return <>{children}</>;

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

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-700" role="status" aria-live="polite">
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
            This is taking longer than usual. Still trying; check that the backend service is running.
          </p>
        )}
      </div>
    </div>
  );
}
