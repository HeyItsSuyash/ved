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
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Insights</h1>
          <p className="text-xs text-slate-500 mt-1">
            Summary of calls, duration, and questions asked.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="px-3.5 py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 6 Core KPIs */}
      {(!subheading || subheading.includes('Overview') || subheading.includes('KPI')) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-200 rounded bg-white">
            <span className="text-xs text-slate-500 block mb-1">Total Calls</span>
            <div className="text-xl font-bold text-slate-900">{totalCalls}</div>
          </div>

          <div className="p-4 border border-slate-200 rounded bg-white">
            <span className="text-xs text-slate-500 block mb-1">Total Talk Time</span>
            <div className="text-xl font-bold text-slate-900">{totalTalkTime}</div>
          </div>

          <div className="p-4 border border-slate-200 rounded bg-white">
            <span className="text-xs text-slate-500 block mb-1">Average Duration</span>
            <div className="text-xl font-bold text-slate-900">{avgTalkTime}</div>
          </div>

          <div className="p-4 border border-slate-200 rounded bg-white">
            <span className="text-xs text-slate-500 block mb-1">Unique Questions</span>
            <div className="text-xl font-bold text-slate-900">{distinctQuestionsCount}</div>
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
              <h3 className="text-sm font-bold text-slate-900">Common Questions Asked by Callers</h3>
              <p className="text-xs text-slate-500">List of questions transcribed from caller audio</p>
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
