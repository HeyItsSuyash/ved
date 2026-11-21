'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  BookOpen,
  Bot,
  ListOrdered,
  LogOut,
  Menu,
  PhoneForwarded,
  Radio,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, type User } from '@/lib/api';
import { cx } from '@/components/ui';
import { formatPhone } from '@/lib/format';
import LivePage from '@/components/pages/LivePage';
import CallLogPage from '@/components/pages/CallLogPage';
import KnowledgePage from '@/components/pages/KnowledgePage';
import InsightsPage from '@/components/pages/InsightsPage';
import AgentPage from '@/components/pages/AgentPage';
import ForwardingPage from '@/components/pages/ForwardingPage';

type PageId = 'live' | 'calls' | 'knowledge' | 'insights' | 'agent' | 'forwarding';

const NAV: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'live', label: 'Live calls', icon: Radio },
  { id: 'calls', label: 'Call log', icon: ListOrdered },
  { id: 'knowledge', label: 'Knowledge base', icon: BookOpen },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'forwarding', label: 'Forwarding', icon: PhoneForwarded },
];

function pageFromHash(): PageId {
  if (typeof window === 'undefined') return 'live';
  const id = window.location.hash.replace('#', '') as PageId;
  return NAV.some((n) => n.id === id) ? id : 'live';
}

export default function Dashboard({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpline, setHelpline] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api<{ helpline: string | null }>('/api/telephony/status')
      .then((d) => setHelpline(d.helpline ?? null))
      .catch(() => setHelpline(null));
  }, []);

  const go = (id: PageId) => {
    window.history.replaceState(null, '', `#${id}`);
    setPage(id);
    setMenuOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-zinc-200">
        <Image
          src="/Madan_Mohan_Malaviya_University_of_Technology_logo.png"
          alt="MMMUT"
          width={28}
          height={28}
          className="shrink-0"
        />
        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold text-zinc-900 truncate">Counselling Support</div>
          <div className="text-xs text-zinc-500">Admin panel</div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-sm cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600',
                active ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Icon className={cx('size-4', active ? 'text-zinc-900' : 'text-zinc-400')} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        {helpline && (
          <div className="px-1 pb-3">
            <div className="text-xs text-zinc-500">Helpline</div>
            <div className="text-sm font-medium text-zinc-900 tabular-nums">{formatPhone(helpline)}</div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[13px] text-zinc-600 truncate" title={user.email}>
            {user.email}
          </span>
          <button
            onClick={onSignOut}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60 bg-white border-r border-zinc-200">{sidebar}</aside>

      {/* Mobile top bar and drawer */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white border-b border-zinc-200">
        <span className="text-sm font-semibold">Counselling Support · Admin</span>
        <button
          onClick={() => setMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-2 top-3 inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          {page === 'live' && <LivePage helpline={helpline} onManageForwarding={() => go('forwarding')} />}
          {page === 'calls' && <CallLogPage />}
          {page === 'knowledge' && <KnowledgePage />}
          {page === 'insights' && <InsightsPage />}
          {page === 'agent' && <AgentPage />}
          {page === 'forwarding' && <ForwardingPage />}
        </div>
      </main>
    </div>
  );
}
