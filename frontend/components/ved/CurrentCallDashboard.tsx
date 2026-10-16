'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneIncoming, 
  Activity, 
  Clock, 
  Volume2, 
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
  const [callStats, setCallStats] = useState({
    totalTodayCalls: 0,
    speechEngine: 'Exotel PCM 8kHz'
  });

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

      socket.onopen = () => {
        console.log('[CurrentCallDashboard] Connected to live call stream');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'call_started') {
            setCallStatus('connected');
            setCurrentCall({
              callSid: payload.data?.callSid,
              caller: payload.data?.caller || payload.data?.phoneNumber || 'Inbound Caller',
              startTime: new Date().toLocaleTimeString()
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
        } catch (err) {
          console.error('[LiveSocket] Error parsing:', err);
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
          setCallStats(prev => ({ ...prev, totalTodayCalls: calls.length }));
          const active = calls.find((c: any) => !c.endTime);
          if (active) {
            setCallStatus('connected');
            setCurrentCall({
              callSid: active.callSid,
              caller: active.phoneNumber || 'Inbound Caller',
              startTime: new Date(active.startTime || Date.now()).toLocaleTimeString()
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
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xs p-6 shadow-sm border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Live Inbound Telephony Stream
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
              EXOTEL VIRTUAL LINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
            {primaryHelpline || '08047281152'}
          </h1>
          <p className="text-xs text-blue-200/80 mt-1.5 max-w-xl">
            Anyone dialing this number connects directly to the VED AI Voice Engine. Real-time audio is processed and transcribed live below.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2.5 rounded-xs border text-xs font-semibold flex items-center gap-2 shadow-xs ${
            callStatus === 'connected' 
              ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse' 
              : 'bg-white/10 text-slate-200 border-white/20'
          }`}>
            <Radio className="w-4 h-4" />
            <span>{callStatus === 'connected' ? 'CALL IN PROGRESS' : 'READY FOR CALLS'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xs border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Current Call State</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 capitalize">
            {callStatus === 'connected' ? 'Live on Line' : 'Idle / Standby'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {callStatus === 'connected' ? `Connected for ${formatSec(callDuration)}` : 'Awaiting incoming call'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Caller</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono truncate">
            {currentCall?.caller || '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {currentCall ? `Started at ${currentCall.startTime}` : 'No active caller'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audio Protocol</span>
            <Volume2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {callStats.speechEngine}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bi-directional WebSocket</p>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Calls Processed</span>
            <PhoneIncoming className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {callStats.totalTodayCalls}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Grounded via Data Room</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xs shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${callStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Conversation Audio Stream</h3>
              <p className="text-[11px] text-slate-500">Real-time bi-directional STT and AI response turns</p>
            </div>
          </div>
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatSec(callDuration)}</span>
            </div>
          )}
        </div>

        <div className="p-6 min-h-[340px] max-h-[460px] overflow-y-auto space-y-4 bg-slate-50/30">
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {callStatus === 'connected' ? 'Listening to Caller...' : 'Waiting for Next Call'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                {callStatus === 'connected'
                  ? 'Caller is connected on the line. When they speak, live transcripts and AI replies will appear here immediately.'
                  : `Dial ${primaryHelpline || '08047281152'} from your phone to initiate a live voice session.`}
              </p>
            </div>
          ) : (
            transcripts.map((turn, i) => (
              <div 
                key={i} 
                className={`flex gap-3 max-w-[85%] ${turn.speaker === 'user' ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                  turn.speaker === 'user' 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-[#2563eb] text-white'
                }`}>
                  {turn.speaker === 'user' ? 'Caller' : 'AI'}
                </div>
                <div className={`p-4 rounded-xs text-xs leading-relaxed shadow-xs border ${
                  turn.speaker === 'user'
                    ? 'bg-white text-slate-800 border-slate-200'
                    : 'bg-blue-600 text-white border-blue-500'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                    <span className="font-bold uppercase tracking-wider">
                      {turn.speaker === 'user' ? 'Caller Speech (STT)' : 'VED Audio Reply (TTS)'}
                    </span>
                    <span>{new Date(turn.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <p className="font-medium text-sm">{turn.text}</p>
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
