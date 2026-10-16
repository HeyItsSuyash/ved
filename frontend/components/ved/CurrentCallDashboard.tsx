'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneIncoming, 
  Clock, 
  User, 
  Radio
} from 'lucide-react';

interface CurrentCallDashboardProps {
  primaryHelpline: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function CurrentCallDashboard({ primaryHelpline }: CurrentCallDashboardProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [totalTodayCalls, setTotalTodayCalls] = useState(0);

  const timerRef = useRef<any>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callStatus === 'idle') setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  useEffect(() => {
    const protocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const cleanUrl = BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}://${cleanUrl}/live`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isUnmounted = false;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'call_started') {
            setCallStatus('connected');
            setCurrentCall({
              callSid: payload.data?.callSid,
              caller: payload.data?.caller || payload.data?.phoneNumber || 'Caller',
              startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setTranscripts([]);
          } else if (payload.event === 'transcript') {
            setTranscripts(prev => [...prev, payload.data]);
          } else if (payload.event === 'call_ended') {
            setCallStatus('idle');
            setTimeout(() => {
              setCurrentCall(null);
            }, 3000);
          } else if (payload.event === 'call_updated') {
            if (payload.data?.updates?.phoneNumber && payload.data.updates.phoneNumber !== 'unknown') {
              setCurrentCall((prev: any) => ({
                ...(prev || {}),
                caller: payload.data.updates.phoneNumber
              }));
            }
          }
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    fetch(`${BACKEND_URL}/calls`)
      .then(res => res.json())
      .then(calls => {
        if (Array.isArray(calls)) {
          setTotalTodayCalls(calls.length);
          const active = calls.find((c: any) => !c.endTime);
          if (active) {
            setCallStatus('connected');
            setCurrentCall({
              callSid: active.callSid,
              caller: active.phoneNumber || 'Caller',
              startTime: new Date(active.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            if (active.turns) setTranscripts(active.turns);
          }
        }
      })
      .catch(() => {});

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []);

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Phone Number Banner: Clean White & Blue */}
      <div className="bg-white border border-slate-200 rounded p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 block mb-1">
            Helpline Number
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {primaryHelpline || '08047281152'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calls to this number are answered by the AI assistant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border ${
            callStatus === 'connected'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-blue-600' : 'bg-slate-400'}`} />
            {callStatus === 'connected' ? 'Call in Progress' : 'Ready'}
          </span>
        </div>
      </div>

      {/* 3 Simple KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Status</span>
          <div className="text-lg font-bold text-slate-900">
            {callStatus === 'connected' ? 'Connected' : 'Waiting for call'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {callStatus === 'connected' ? `Duration: ${formatSec(callDuration)}` : 'Line is open'}
          </span>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Current Caller</span>
          <div className="text-lg font-bold text-slate-900 font-mono truncate">
            {currentCall?.caller || 'None'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {currentCall ? `Started at ${currentCall.startTime}` : 'No active caller'}
          </span>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Total Calls</span>
          <div className="text-lg font-bold text-slate-900">
            {totalTodayCalls}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Calls received
          </span>
        </div>
      </div>

      {/* Live Conversation Stream */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-semibold text-slate-800">
            Live Call Conversation
          </span>
          {callStatus === 'connected' && (
            <span className="text-xs font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {formatSec(callDuration)}
            </span>
          )}
        </div>

        <div className="p-6 min-h-[300px] max-h-[440px] overflow-y-auto space-y-3 bg-white">
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <PhoneCall className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-medium text-slate-600">
                {callStatus === 'connected' ? 'Call connected. Listening...' : 'No call in progress'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {callStatus === 'connected'
                  ? 'Speech from the caller and AI responses will show here in real time.'
                  : `Dial ${primaryHelpline || '08047281152'} to start a conversation.`}
              </p>
            </div>
          ) : (
            transcripts.map((turn, i) => (
              <div 
                key={i} 
                className={`flex flex-col max-w-[80%] ${turn.speaker === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}
              >
                <span className="text-[11px] text-slate-400 mb-1 px-1">
                  {turn.speaker === 'user' ? 'Caller' : 'AI Assistant'}
                </span>
                <div className={`p-3 rounded text-xs leading-relaxed ${
                  turn.speaker === 'user'
                    ? 'bg-slate-100 text-slate-800 border border-slate-200'
                    : 'bg-blue-600 text-white'
                }`}>
                  {turn.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptsEndRef} />
        </div>
      </div>
    </div>
  );
}
