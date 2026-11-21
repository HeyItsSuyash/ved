'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { ApiError, api, clearSession, getToken, type User } from '@/lib/api';
import { Loading, Notice } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<User>('/auth/me')
      .then((u) => {
        setUser(u);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace('/login');
        } else {
          setError(err.message);
        }
      });
  }, [router, attempt]);

  if (user) {
    return (
      <Dashboard
        user={user}
        onSignOut={() => {
          clearSession();
          router.replace('/login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      {error ? (
        <div className="w-full max-w-sm">
          <Notice onRetry={() => setAttempt((n) => n + 1)}>{error}</Notice>
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
}
