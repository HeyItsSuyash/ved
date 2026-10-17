'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  ChevronDown,
  LogOut,
  FolderLock,
  PhoneCall,
  Activity,
  Menu,
  X,
  Sparkles,
  Radio,
  MessageSquare,
  Database,
  ShieldCheck,
  Headphones,
  Zap,
  CheckCircle2
} from 'lucide-react';

import MmmutLogo from './MmmutLogo';
import VedInsights from './ved/VedInsights';
import VedDocuments from './ved/VedDocuments';
import CurrentCallDashboard from './ved/CurrentCallDashboard';

interface StudentDashboardProps {
  studentRoll?: string;
  initialUser?: any;
  onLogout: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function StudentDashboard({
  onLogout
}: StudentDashboardProps) {
  // Navigation: only 3 core tabs
  const [activeTab, setActiveTab] = useState<'CallDashboard' | 'DataRoom' | 'Insights'>('CallDashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [primaryHelpline, setPrimaryHelpline] = useState<string>('08047281152');

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/ved/numbers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.numbers) && data.numbers.length > 0) {
          setPrimaryHelpline(data.numbers[0].number);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      id: 'CallDashboard' as const,
      title: 'Call Dashboard',
      description: 'Live call status and conversation',
      icon: PhoneCall
    },
    {
      id: 'DataRoom' as const,
      title: 'Data Room',
      description: 'Knowledge base and uploaded files',
      icon: FolderLock
    },
    {
      id: 'Insights' as const,
      title: 'Insights',
      description: 'Call counts and common questions',
      icon: Activity
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs h-15 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setActiveTab('CallDashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <MmmutLogo size={42} className="shrink-0 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-slate-900 font-bold text-xs sm:text-sm tracking-tight leading-tight">
                Madan Mohan Malaviya University of Technology
              </span>
              <span className="text-xs text-slate-500">
                AI Voice Helpline Dashboard
              </span>
            </div>
          </div>
        </div>

        {/* Right Status & Admin Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Helpline Active
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-white shadow-xs">
                <User className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 font-mono">
                admin
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-sm shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">Admin</p>
                  <span className="text-[10px] text-blue-600 font-medium">VED System Root</span>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Locked to the side, non-scrollable, showing 7 app features */}
        <aside
          className={`fixed md:relative inset-y-0 md:inset-auto z-20 w-68 bg-white md:bg-[#f8fafc] border-r border-slate-200 flex flex-col justify-between shrink-0 h-full overflow-hidden select-none transition-transform duration-200 ease-in-out ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Top Section: Navigation Links */}
          <div className="p-3 space-y-1 shrink-0">
            <div className="px-2 pb-2 mb-2 border-b border-slate-200/70 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Core Navigation
              </span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                v2.4
              </span>
            </div>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-[#2563eb] border-l-4 border-[#2563eb] shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100/70 border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-[#2563eb]' : 'text-slate-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold leading-tight">{item.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Middle Section: 7 App Features */}
          <div className="px-3 py-2 shrink-0">
            <div className="p-3 bg-white border border-slate-200/90 rounded-lg shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Application Features
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  7 Active
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Feature 1 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Radio className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Live Voice Streaming & Barge-In</span>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Real-Time Call Transcript</span>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Database className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">CSV & Document Q&A Indexer</span>
                </div>

                {/* Feature 4 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Grounded AI Knowledge Answers</span>
                </div>

                {/* Feature 5 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Headphones className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Dual Exotel & Twilio Telephony</span>
                </div>

                {/* Feature 6 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Activity className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Helpline Analytics & Call KPIs</span>
                </div>

                {/* Feature 7 */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Multi-Number Fallback Pool</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Helpline Quick Status */}
          <div className="p-3 border-t border-slate-200/70 bg-slate-50/70 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-600">Active Virtual PRI</span>
              <span className="font-mono font-bold text-slate-800 text-[11px]">{primaryHelpline}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-600">Knowledge Sync</span>
              <span className="text-[9px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Auto-Synchronized
              </span>
            </div>
            <div className="pt-1 border-t border-slate-200/50 flex items-center justify-between text-[9px] text-slate-400">
              <span>MMMUT Voice Node</span>
              <span className="font-mono">ONLINE</span>
            </div>
          </div>
        </aside>

        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-10 md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-xs text-slate-500 mb-6">
              <span className="text-slate-400">Portal</span>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-900 font-semibold">
                {navItems.find(n => n.id === activeTab)?.title}
              </span>
            </div>

            {/* TAB 1: CURRENT CALL & DASHBOARD */}
            {activeTab === 'CallDashboard' && (
              <CurrentCallDashboard primaryHelpline={primaryHelpline} />
            )}

            {/* TAB 2: DATA ROOM */}
            {activeTab === 'DataRoom' && (
              <VedDocuments />
            )}

            {/* TAB 3: INSIGHTS & ANALYTICS */}
            {activeTab === 'Insights' && (
              <VedInsights onQuickCall={() => setActiveTab('CallDashboard')} />
            )}

            <div className="mt-auto pt-10 pb-4">
              <p className="text-[12px] text-slate-400 font-medium">
                MMMUT AI Voice Helpline
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
