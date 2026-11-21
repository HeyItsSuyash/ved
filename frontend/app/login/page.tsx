'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, getToken, saveSession, type User } from '@/lib/api';
import { Button, Field, Input, Notice } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) router.replace('/');
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveSession(res.token, res.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/Madan_Mohan_Malaviya_University_of_Technology_logo.png"
            alt="MMMUT"
            width={40}
            height={40}
            priority
          />
          <div className="leading-tight">
            <div className="text-base font-semibold text-zinc-900">VED</div>
            <div className="text-sm text-zinc-500">MMMUT Helpline</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-zinc-900">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-500">Staff access to the helpline dashboard.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Notice>{error}</Notice>}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          No account? Ask an administrator to create one.
        </p>
      </div>
    </div>
  );
}
