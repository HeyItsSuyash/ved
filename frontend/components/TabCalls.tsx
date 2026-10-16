import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Clock,
  FileText,
  ChevronRight,
  Activity,
  Search,
  Filter,
  Terminal,
  Settings,
  PhoneOff,
  AlertCircle,
  TrendingUp,
  Cpu,
  Mic,
  MicOff,
  Calendar,
  Volume2,
  ListFilter,
  Play,
  Download,
  AlertTriangle,
  FolderOpen,
  RefreshCw
} from 'lucide-react';

interface TabCallsProps {
  transcripts: any[];
  callStatus: string;
  callSid: string | null;
  onCall: (number: string) => void;
  onHangup: () => void;
  onMute: (muted: boolean) => void;
  activeSubpage?: string;
  liveCalls: any[];
}

const TabCalls: React.FC<TabCallsProps> = ({
  transcripts,
  callStatus,
  callSid,
  onCall,
  onHangup,
  onMute,
  activeSubpage,
  liveCalls
}) => {
  const [selectedSubpage, setSelectedSubpage] = useState<'Live Calls' | 'Recent Calls' | 'Scheduled Calls' | 'Recordings' | 'Call Logs'>('Live Calls');

  React.useEffect(() => {
    if (activeSubpage) {
      setSelectedSubpage(activeSubpage as any);
    }
  }, [activeSubpage]);

  const [phoneNumber, setPhoneNumber] = useState('+91 63069 87592');
  const [isMuted, setIsMuted] = useState(false);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);

  // Fetch completed calls from backend for Recent Calls / Call Logs views
  const fetchRecentCalls = async () => {
    setIsLoadingCalls(true);
    try {
      // Use relative API call if possible, or construct from window.location
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ||
        (typeof window !== 'undefined' && window.location.hostname.includes('caller.work')
          ? 'https://caller-24ie.onrender.com'
          : 'http://127.0.0.1:3001');

      const response = await fetch(`${backendUrl}/calls`);
      if (response.ok) {
        const data = await response.json();
        setRecentCalls(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[TabCalls] Failed to fetch recent calls:', err);
    } finally {
      setIsLoadingCalls(false);
    }
  };

  // Load recent calls when switching to those subpages
  useEffect(() => {
    if (selectedSubpage === 'Recent Calls' || selectedSubpage === 'Call Logs') {
      fetchRecentCalls();
    }
  }, [selectedSubpage]);

  // Also refresh when a call ends (callStatus goes back to 'idle')
  useEffect(() => {
    if (callStatus === 'idle' && (selectedSubpage === 'Recent Calls' || selectedSubpage === 'Call Logs')) {
      fetchRecentCalls();
    }
  }, [callStatus]);

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMute(newMuted);
  };

  // Format duration from seconds or ISO timestamps
  const formatDuration = (call: any): string => {
    if (call.duration) return call.duration;
    if (call.startTime) {
      try {
        const start = new Date(call.startTime).getTime();
        const end = call.endTime ? new Date(call.endTime).getTime() : Date.now();
        const secs = Math.floor((end - start) / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
      } catch { return '--:--'; }
    }
    return '--:--';
  };

  // Format call timestamp
  const formatTime = (call: any): string => {
    if (!call.startTime) return 'Unknown';
    try {
      const d = new Date(call.startTime);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
      if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
      return d.toLocaleDateString();
    } catch { return 'Unknown'; }
  };

  // Determine call status display
  const getCallStatusLabel = (): string => {
    switch (callStatus) {
      case 'connected': return 'Connected';
      case 'calling': return 'Dialing Trunk';
      case 'error': return 'Error';
      default: return 'Gateway Idle';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-white relative">

      {/* Subpage Tabs Switcher */}
      <div className="px-8 border-b border-white/5 bg-black/60 shrink-0 flex justify-between items-center h-12">
        <div className="flex gap-4">
          {(['Live Calls', 'Recent Calls', 'Scheduled Calls', 'Recordings', 'Call Logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubpage(tab)}
              className={`text-[9px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer relative h-12
                ${selectedSubpage === tab ? 'text-white font-extrabold' : 'text-neutral-500 hover:text-white'}
              `}
            >
              {tab}
              {selectedSubpage === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Display Area */}
      <div className="flex-1 overflow-hidden flex">

        {/* ====================================================
            LIVE CALLS SUBPAGE
            ==================================================== */}
        {selectedSubpage === 'Live Calls' && (
          <div className="flex-1 flex divide-x divide-white/10 overflow-hidden">
            {/* Left dial controller */}
            <div className="w-1/3 p-6 flex flex-col gap-6 bg-[#0a0a0a]/30 overflow-y-auto">
              {/* INBOUND HELPLINE BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-black to-neutral-900 border border-emerald-500/30 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Inbound Helpline
                  </span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    EXOTEL
                  </span>
                </div>
                <p className="text-lg font-black tracking-wider text-white font-mono">08047281152</p>
                <p className="text-[9px] text-neutral-400 font-medium mt-1 leading-relaxed">
                  Call this number from any phone. The AI assistant will answer and live transcripts will show right here.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-display mb-1">Outbound Dialer (Optional)</h3>
                <p className="text-[9px] text-neutral-500 font-bold uppercase">Manual outbound test call if needed</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Phone Number</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number..."
                    disabled={callStatus === 'calling' || callStatus === 'connected'}
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:border-white focus:ring-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onCall(phoneNumber)}
                    disabled={callStatus === 'calling' || callStatus === 'connected'}
                    className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2
                      ${callStatus === 'idle' || callStatus === 'error'
                        ? 'bg-white text-black hover:bg-neutral-100'
                        : 'bg-white/5 text-neutral-500 cursor-not-allowed opacity-50'}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Dial</span>
                  </button>
                  <button
                    onClick={onHangup}
                    disabled={callStatus !== 'connected' && callStatus !== 'calling'}
                    className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2
                      ${(callStatus === 'connected' || callStatus === 'calling')
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-white/5 text-neutral-500 cursor-not-allowed opacity-50'}`}
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Hangup</span>
                  </button>
                </div>

                {/* Mute Toggle — only available when connected */}
                {callStatus === 'connected' && (
                  <button
                    onClick={handleMuteToggle}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border
                      ${isMuted
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'}`}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                )}
              </div>

              {/* Status Display */}
              <div className="p-4 rounded-2xl bg-black border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      callStatus === 'connected' ? 'bg-emerald-400' :
                      callStatus === 'calling' ? 'bg-amber-400' : 'bg-neutral-600'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      callStatus === 'connected' ? 'bg-emerald-500' :
                      callStatus === 'calling' ? 'bg-amber-500' : 'bg-neutral-500'
                    }`}></span>
                  </span>
                  <div>
                    <p className="text-[10px] font-black text-white leading-none">Telephony State</p>
                    <p className="text-[8px] text-neutral-500 uppercase tracking-widest mt-0.5">
                      {getCallStatusLabel()}
                    </p>
                  </div>
                </div>
                {callSid && (
                  <span className="text-[7px] font-mono text-neutral-600 truncate max-w-[80px]" title={callSid}>
                    {callSid.slice(-8)}
                  </span>
                )}
              </div>

              {/* Live Calls Summary */}
              {liveCalls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Active Sessions</p>
                  <div className="space-y-2">
                    {liveCalls.slice(0, 3).map((lc: any, i: number) => (
                      <div key={i} className="p-3 bg-black border border-white/5 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-mono text-white">{lc.phoneNumber || 'Unknown'}</p>
                          <p className="text-[8px] text-neutral-500 uppercase">{lc.entity || 'Agent'}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          lc.resolution_status === 'pending' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'
                        }`}>
                          {lc.resolution_status || 'active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Active Transcript Screen */}
            <div className="flex-1 flex flex-col justify-between bg-black overflow-hidden relative">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-display">Live Speech Gateway</h3>
                <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${
                  callStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/10 text-neutral-400'
                }`}>
                  {callStatus === 'connected' ? 'Stream Active' : 'WebSocket Standby'}
                </span>
              </div>

              {/* Active Audio Waveform & Speech states */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {(callStatus === 'connected' || callStatus === 'calling') && transcripts.length > 0 ? (
                  transcripts.map((t, i) => (
                    <div key={i} className={`flex flex-col ${t.speaker === 'user' ? 'items-start' : 'items-end'} space-y-1`}>
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1">{t.speaker === 'user' ? 'Caller' : 'AI Agent'}</span>
                      <div className={`px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed max-w-[75%] shadow-sm ${
                        t.speaker === 'user' ? 'bg-[#0a0a0a] border border-white/10 text-white rounded-tl-none' : 'bg-white text-black rounded-tr-none'
                      }`}>
                        {t.text}
                      </div>
                    </div>
                  ))
                ) : callStatus === 'calling' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Phone className="w-8 h-8 mb-3 text-amber-500" />
                    </motion.div>
                    <p className="text-xs font-black uppercase tracking-widest text-white">Dialing...</p>
                    <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Waiting for recipient to answer</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                    <Volume2 className="w-8 h-8 mb-3 text-neutral-600 animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-widest text-white">No Active Voice Stream</p>
                    <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Grounded telemetry registers when call connects</p>
                  </div>
                )}
              </div>

              {/* Live Waveform when connected */}
              {callStatus === 'connected' && (
                <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/50 flex gap-1 h-14 items-center justify-center overflow-hidden">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[2.5px] bg-white rounded-full"
                      animate={{ height: [4, Math.floor(Math.random() * 32) + 8, 4] }}
                      transition={{ duration: 0.8 + (i % 4) * 0.1, repeat: Infinity, delay: i * 0.02 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            RECENT CALLS SUBPAGE
            ==================================================== */}
        {selectedSubpage === 'Recent Calls' && (
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 font-display">Recent Calls</h3>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Logs of completed conversation routes</p>
                </div>
                <button
                  onClick={fetchRecentCalls}
                  disabled={isLoadingCalls}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCalls ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {isLoadingCalls ? (
                <div className="text-center py-12 text-neutral-500">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-xs font-bold uppercase">Loading calls...</p>
                </div>
              ) : recentCalls.length === 0 ? (
                <div className="text-center py-16 text-neutral-600">
                  <FolderOpen className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-white">No calls recorded yet</p>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Initiate a call from the Live Calls tab</p>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/50 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                        <th className="px-6 py-4">Number</th>
                        <th className="px-6 py-4">Agent</th>
                        <th className="px-6 py-4">Intent</th>
                        <th className="px-6 py-4">Resolution</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentCalls.map((call: any, i: number) => (
                        <tr key={call.callSid || i} className="hover:bg-white/[0.02] transition-colors text-xs font-semibold">
                          <td className="px-6 py-4 font-mono text-white">{call.phoneNumber || 'Unknown'}</td>
                          <td className="px-6 py-4 text-neutral-300">{call.entity || '—'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-wider rounded text-neutral-400">
                              {call.summary?.intent || call.resolution_status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              call.resolution_status === 'resolved'
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-neutral-400 bg-white/5'
                            }`}>
                              {call.resolution_status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-300 font-mono">{formatDuration(call)}</td>
                          <td className="px-6 py-4 text-neutral-500">{formatTime(call)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            SCHEDULED CALLS SUBPAGE
            ==================================================== */}
        {selectedSubpage === 'Scheduled Calls' && (
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 font-display">Scheduled Calls</h3>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Queued outbound campaigns pending dialer windows</p>
                </div>
                <button className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-100 transition-all cursor-pointer">
                  Schedule Call
                </button>
              </div>

              <div className="text-center py-16 text-neutral-600">
                <Calendar className="w-8 h-8 mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-white">No Scheduled Calls</p>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Campaign scheduling is managed via the Campaigns tab</p>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            RECORDINGS SUBPAGE
            ==================================================== */}
        {selectedSubpage === 'Recordings' && (
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 font-display">Audio Recordings Library</h3>
                <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Access voice archives and call playback waveforms</p>
              </div>

              {recentCalls.length === 0 ? (
                <div className="text-center py-16 text-neutral-600">
                  <Volume2 className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-white">No Recordings Available</p>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Recordings are generated automatically after calls complete</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCalls.map((record: any, i: number) => (
                    <div key={record.callSid || i} className="p-5 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black hover:bg-neutral-100 transition-all cursor-pointer">
                          <Play className="w-4 h-4" />
                        </button>
                        <div>
                          <h4 className="text-xs font-black text-white font-mono">{record.phoneNumber || 'Unknown'}</h4>
                          <p className="text-[9.5px] text-neutral-500 font-bold uppercase mt-0.5">
                            Agent: {record.entity || '—'} • Duration: {formatDuration(record)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer">
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSubpage('Live Calls')}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Inspect Transcript
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            CALL LOGS SUBPAGE
            ==================================================== */}
        {selectedSubpage === 'Call Logs' && (
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 font-display">System-wide Call Logs</h3>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Filterable telecom carrier events</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchRecentCalls}
                    disabled={isLoadingCalls}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingCalls ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {isLoadingCalls ? (
                <div className="text-center py-12 text-neutral-500">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-xs font-bold uppercase">Loading logs...</p>
                </div>
              ) : recentCalls.length === 0 ? (
                <div className="text-center py-16 text-neutral-600">
                  <Terminal className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-white">No Call Logs Available</p>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Session logs appear here after calls are initiated</p>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/50 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                        <th className="px-6 py-4">Session ID</th>
                        <th className="px-6 py-4">Number</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Turns</th>
                        <th className="px-6 py-4">Resolution</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-xs text-neutral-400">
                      {recentCalls.map((log: any, i: number) => {
                        const isResolved = log.resolution_status === 'resolved';
                        const shortSid = log.callSid ? log.callSid.slice(-8) : `sess_${i}`;
                        return (
                          <tr key={log.callSid || i} className="hover:bg-white/[0.02] transition-colors font-semibold">
                            <td className="px-6 py-4 text-white font-mono text-[10px]">{shortSid}</td>
                            <td className="px-6 py-4 text-white">{log.phoneNumber || 'Unknown'}</td>
                            <td className="px-6 py-4">{formatDuration(log)}</td>
                            <td className="px-6 py-4">{log.turns?.length ?? 0} turns</td>
                            <td className="px-6 py-4 text-neutral-400 font-sans text-[10px]">
                              {log.summary ? `${log.summary?.substring?.(0, 30) || 'Summarized'}...` : 'Pending'}
                            </td>
                            <td className="px-6 py-4 font-sans">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isResolved ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                              }`}>
                                {log.resolution_status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TabCalls;
