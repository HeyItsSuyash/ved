import React from 'react';
import { 
  PhoneCall, 
  Settings, 
  Layers, 
  Cpu, 
  HelpCircle, 
  CheckCircle2, 
  Plus, 
  ShieldAlert, 
  ExternalLink 
} from 'lucide-react';

const TabTelephony = () => {
  const activeNumbers = [
    { number: '08047281152', label: 'Primary Inbound Helpline (ExoPhone)', status: 'Active', rate: '₹0.60/min', region: 'India (Bangalore)' },
    { number: '+1 662 481 8479', label: 'Twilio Line (Backup)', status: 'Active', rate: '₹0.85/min', region: 'United States' },
    { number: '+91 80 4719 3982', label: 'Inbound FAQ Support', status: 'Routing Inactive', rate: '₹1.20/min', region: 'India (Bangalore)' }
  ];

  const providers = [
    { name: 'Twilio', logo: 'TW', status: 'Connected', desc: 'Standard Telephony & WebSockets Stream Protocol.', active: true },
    { name: 'Exotel', logo: 'EX', status: 'Connected', desc: 'Enterprise localized Indian numbers & real-time inbound AI streaming.', active: true },
    { name: 'Plivo', logo: 'PL', status: 'Coming Soon', desc: 'High-availability global SMS and Voice interfaces.', active: false },
    { name: 'Knowlarity', logo: 'KN', status: 'Coming Soon', desc: 'Virtual cloud telephony routing and IVR services.', active: false },
    { name: 'Custom SIP Trunk', logo: 'SIP', status: 'Coming Soon', desc: 'Direct connection to local office PBX hardware.', active: false }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-black p-8 overflow-y-auto scrollbar-hide text-white">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-16">
        
        {/* Telephony Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white font-display">Telephony & Carriers</h1>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mt-1">Configure active numbers and abstract carrier routing protocols</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-xs font-bold hover:bg-neutral-100 transition-all shadow-lg cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Number</span>
          </button>
        </div>

        {/* Dynamic Provider Selection Grid */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-display">Integrated Providers</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p, i) => (
              <div 
                key={i} 
                className={`p-6 border rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between ${
                  p.active 
                    ? 'border-white/10 bg-[#0a0a0a] shadow-md' 
                    : 'border-white/5 bg-neutral-900/10 opacity-60'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                      p.active ? 'bg-white text-black shadow-lg' : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {p.logo}
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      p.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white mb-1.5 font-display">{p.name}</h4>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed mb-6">{p.desc}</p>
                </div>

                {p.active ? (
                  <button className="w-full py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-100 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage Carrier</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-neutral-500 text-center select-none">
                    Abstraction Unlocked soon
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Numbers Table */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-display">Attached Phone Numbers</h3>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-white/5">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Phone Number</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Label / Name</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Provider</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Billing Rates</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Region</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeNumbers.map((num, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-xs font-bold text-white">{num.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-400 font-semibold">{num.label}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase bg-white text-black px-2 py-0.5 rounded">Twilio</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-white">{num.rate}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500 font-medium">{num.region}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        num.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-neutral-500'
                      }`}>
                        {num.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Telecom Latency Warnings */}
        <div className="p-6 border border-white/5 rounded-[2rem] bg-[#0a0a0a] flex gap-4 items-center">
          <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-0.5 font-display">Telemetry Auto-Routing</h4>
            <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
              VANI Gateway manages binary speech packets at $\leq$ 32kbps to prevent buffering jitter. If local ISP latencies climb over 120ms, the system automatically redirects packets over redundant backup trunks to keep the call responsive.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TabTelephony;
