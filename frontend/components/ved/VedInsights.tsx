'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneIncoming, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface VedInsightsProps {
  onQuickCall?: () => void;
  subheading?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function VedInsights({ onQuickCall, subheading = 'Overview & KPIs' }: VedInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${BACKEND_URL}/api/ved/insights`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.warn('Backend unavailable, using college portal defaults for VED insights:', err.message);
      setInsights({
        totalCalls: 0,
        totalTalkTime: '0s',
        avgTalkTime: '0s',
        distinctQuestionsCount: 0,
        successRate: 0,
        activeLines: 1,
        totalLines: 1,
        outcomes: { resolved: 0, in_progress: 0, follow_up_needed: 0, escalated: 0 },
        faqs: [],
        trends: [
          { date: "Mon", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Tue", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Wed", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Thu", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Fri", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Sat", calls: 0, talkTimeMins: 0, successRate: 0 },
          { date: "Today", calls: 0, talkTimeMins: 0, successRate: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const totalCalls = insights?.totalCalls ?? 0;
  const totalTalkTime = insights?.totalTalkTime || '0s';
  const avgTalkTime = insights?.avgTalkTime || '0s';
  const distinctQuestionsCount = insights?.distinctQuestionsCount ?? 0;
  const successRate = insights?.successRate ?? 0;
  const activeLines = insights?.activeLines ?? 1;
  const totalLines = insights?.totalLines ?? 1;

  const outcomes = insights?.outcomes || { resolved: 0, in_progress: 0, follow_up_needed: 0, escalated: 0 };

  const faqs = insights?.faqs || [];
  const trendsData = insights?.trends || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live AI Assistance
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Line Pool: {activeLines}/{totalLines} Active Lines
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">VED Insights & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime metrics across caller queries, automated resolutions, and student helpdesk trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="px-3 py-1.5 rounded-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          {onQuickCall && (
            <button
              onClick={onQuickCall}
              className="px-3.5 py-1.5 rounded-xs bg-[#2563eb] text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Test VED Call</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Core KPIs */}
      {(!subheading || subheading.includes('Overview') || subheading.includes('KPI')) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Calls</span>
              <PhoneIncoming className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalCalls}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">↑ 22.4% this week</div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Talk Time</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalTalkTime}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">Grounded AI dialog</div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Talk Time</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{avgTalkTime}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">Per session avg</div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unique Queries</span>
              <HelpCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{distinctQuestionsCount}</div>
            <div className="text-[10px] text-indigo-600 font-medium mt-1">Topics identified</div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolution Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600">{successRate}%</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">Solved autonomously</div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xs bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Telephony Lines</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{activeLines}/{totalLines}</div>
            <div className="text-[10px] text-amber-600 font-medium mt-1">Line fallback active</div>
          </div>
        </div>
      )}

      {/* Chart & Outcomes */}
      {(!subheading || subheading.includes('Overview') || subheading.includes('Trend')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 border border-slate-200 rounded-xs bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Call Volume & Resolution Trend</h3>
                <p className="text-xs text-slate-500">Weekly call volume handled by VED Assistance</p>
              </div>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              {totalCalls === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-sm w-full h-full bg-slate-50/50">
                  <Activity className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Awaiting Inbound Calls</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                    Call volume and resolution trends will plot dynamically as callers dial 08047281152.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsData}>
                    <defs>
                      <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '4px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="calls" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#callGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Outcome Breakdown */}
          <div className="p-6 border border-slate-200 rounded-xs bg-white shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Call Outcomes</h3>
              <p className="text-xs text-slate-500">Autonomous resolution distribution</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded border border-emerald-100">
                <span className="font-semibold text-emerald-800">Directly Resolved</span>
                <span className="font-bold text-emerald-900">{outcomes.resolved} calls</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded border border-blue-100">
                <span className="font-semibold text-blue-800">In Progress</span>
                <span className="font-bold text-blue-900">{outcomes.in_progress} calls</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-amber-50 rounded border border-amber-100">
                <span className="font-semibold text-amber-800">Follow-up Needed</span>
                <span className="font-bold text-amber-900">{outcomes.follow_up_needed} calls</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-red-50 rounded border border-red-100">
                <span className="font-semibold text-red-800">Escalated to Staff</span>
                <span className="font-bold text-red-900">{outcomes.escalated} calls</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Student Queries & FAQs */}
      {(!subheading || subheading.includes('Overview') || subheading.includes('Question') || subheading.includes('FAQ')) && (
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Frequent Student Queries & Inquiries</h3>
              <p className="text-xs text-slate-500">Frequently recurring topics resolved by VED conversational agent</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {faqs.length} Trending Questions
            </span>
          </div>

          {faqs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-sm bg-slate-50/50">
              <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Inquiries Recorded Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Questions asked by callers will be categorized and aggregated here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-800">{faq.question}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                      {faq.category}
                    </span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      {faq.count} inquiries
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
