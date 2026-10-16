import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Settings2, 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  ShieldCheck, 
  Sliders, 
  Save, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';
import AdminTable from './AdminTable';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

interface PhoneNumber {
  id: string;
  number: string;
  label: string;
  provider: 'exotel' | 'twilio';
  status: 'Active' | 'Standby' | 'Disabled';
  isPrimary: boolean;
  routingRule: string;
  assignedAgent: string;
  forwardTo: string;
  callsHandled: number;
}

interface RoutingRules {
  strategy: 'primary_first' | 'round_robin' | 'simultaneous';
  fallbackTimeoutSeconds: number;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  recordCalls: boolean;
  enableBargeIn: boolean;
}

const TabAdminNumbers: React.FC = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRules>({
    strategy: 'primary_first',
    fallbackTimeoutSeconds: 15,
    businessHoursOnly: false,
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    recordCalls: true,
    enableBargeIn: true
  });
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formProvider, setFormProvider] = useState<'exotel' | 'twilio'>('exotel');
  const [formStatus, setFormStatus] = useState<'Active' | 'Standby' | 'Disabled'>('Active');
  const [formRule, setFormRule] = useState('always_active');
  const [formAgent, setFormAgent] = useState('Default Agent');
  const [formForward, setFormForward] = useState('');

  const fetchNumbersData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/numbers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNumbers(data.numbers || []);
        if (data.routingRules) setRoutingRules(data.routingRules);
      }
    } catch (err: any) {
      console.error('Failed to fetch numbers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbersData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormNumber('');
    setFormLabel('');
    setFormProvider('exotel');
    setFormStatus('Active');
    setFormRule('fallback_on_busy');
    setFormAgent('Default Agent');
    setFormForward('');
    setModalOpen(true);
  };

  const openEditModal = (item: PhoneNumber) => {
    setEditingId(item.id);
    setFormNumber(item.number);
    setFormLabel(item.label);
    setFormProvider(item.provider);
    setFormStatus(item.status);
    setFormRule(item.routingRule);
    setFormAgent(item.assignedAgent || 'Default Agent');
    setFormForward(item.forwardTo || '');
    setModalOpen(true);
  };

  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        number: formNumber,
        label: formLabel,
        provider: formProvider,
        status: formStatus,
        routingRule: formRule,
        assignedAgent: formAgent,
        forwardTo: formForward
      };

      const url = editingId 
        ? `${BACKEND_URL}/admin/numbers/${editingId}`
        : `${BACKEND_URL}/admin/numbers`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save number');

      setMsg({ type: 'success', text: editingId ? 'Number updated successfully' : 'New number added' });
      setModalOpen(false);
      fetchNumbersData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/numbers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPrimary: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set primary number');
      setMsg({ type: 'success', text: 'Primary number changed. First number is now active primary helpline.' });
      fetchNumbersData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteNumber = async (id: string, isPrimary: boolean) => {
    if (isPrimary) {
      setMsg({ type: 'error', text: 'First number is the primary number and cannot be deleted.' });
      return;
    }
    if (!confirm('Are you sure you want to remove this line?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/numbers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete number');
      setMsg({ type: 'success', text: 'Number removed' });
      fetchNumbersData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSaveRoutingRules = async () => {
    setSavingRules(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/routing-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(routingRules)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save routing rules');
      setMsg({ type: 'success', text: 'Routing rules updated and synchronized across telephony services.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="p-8 h-full bg-transparent overflow-y-auto text-white space-y-8 scrollbar-hide">
      
      {/* Alert Notification */}
      {msg && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-xs font-semibold ${
          msg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight mb-1 text-white font-display uppercase italic">
            Phone Numbers & Carrier Routing
          </h2>
          <p className="text-xs text-neutral-500 font-semibold uppercase tracking-widest">
            Manage inbound/outbound virtual numbers. The first number is strictly the primary helpline.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-100 transition-all shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Phone Number</span>
        </button>
      </div>

      {/* Numbers Table */}
      <AdminTable
        title="Registered Telephony Lines"
        headers={['Line / Phone Number', 'Provider', 'Priority Role', 'Routing Rule', 'Status', 'Actions']}
        data={numbers}
        loading={loading}
        renderRow={(num, idx) => (
          <tr key={num.id} className={`hover:bg-white/[0.02] transition-colors ${idx === 0 ? 'bg-white/[0.02]' : ''}`}>
            {/* Number + Label */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">{num.number}</span>
                    {idx === 0 && (
                      <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-300" />
                        <span>Primary Line (First)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium">{num.label}</p>
                </div>
              </div>
            </td>

            {/* Carrier Provider */}
            <td className="px-6 py-4">
              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                num.provider === 'exotel'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {num.provider}
              </span>
            </td>

            {/* Position / Role */}
            <td className="px-6 py-4 text-xs font-semibold">
              {idx === 0 ? (
                <span className="text-amber-400 font-bold">Line #1 (Primary)</span>
              ) : (
                <span className="text-neutral-400">Line #{idx + 1} (Secondary)</span>
              )}
            </td>

            {/* Routing Rule */}
            <td className="px-6 py-4 text-xs text-neutral-300 font-mono">
              {num.routingRule || 'fallback_on_busy'}
            </td>

            {/* Status */}
            <td className="px-6 py-4">
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                num.status === 'Active' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-neutral-800 text-neutral-500'
              }`}>
                {num.status}
              </span>
            </td>

            {/* Action buttons */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                {idx !== 0 && (
                  <button
                    onClick={() => handleSetPrimary(num.id)}
                    title="Set as First (Primary) Number"
                    className="p-1.5 hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400 rounded-lg transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(num)}
                  title="Edit Line & Routing"
                  className="p-1.5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {idx !== 0 && (
                  <button
                    onClick={() => handleDeleteNumber(num.id, num.isPrimary)}
                    title="Delete Number"
                    className="p-1.5 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}
      />

      {/* Global Routing Rules Configuration Box */}
      <div className="p-6 border border-white/[0.05] rounded-lg bg-white/[0.015] backdrop-blur-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-display">
              Telephony Routing Rules
            </h3>
          </div>
          <button
            onClick={handleSaveRoutingRules}
            disabled={savingRules}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingRules ? 'Applying...' : 'Save Routing Rules'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Strategy */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Routing Dispatch Strategy
            </label>
            <select
              value={routingRules.strategy}
              onChange={(e) => setRoutingRules({ ...routingRules, strategy: e.target.value as any })}
              className="w-full text-xs font-bold p-3 bg-[#0a0a0a] border border-white/[0.05] text-white rounded-lg focus:border-white/20 focus:ring-0"
            >
              <option value="primary_first">Primary Line First (Automatic Fallback)</option>
              <option value="round_robin">Round Robin (Distribute Evenly)</option>
              <option value="simultaneous">Simultaneous Dual-Trunk Ring</option>
            </select>
            <p className="text-[10px] text-neutral-500">
              Always dials Line #1 first. If busy or unanswered, immediately rolls over to subsequent lines.
            </p>
          </div>

          {/* Fallback Timeout */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Fallback Failover Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={routingRules.fallbackTimeoutSeconds}
              onChange={(e) => setRoutingRules({ ...routingRules, fallbackTimeoutSeconds: parseInt(e.target.value, 10) || 15 })}
              className="w-full text-xs font-bold p-3 bg-[#0a0a0a] border border-white/[0.05] text-white rounded-lg focus:border-white/20 focus:ring-0 font-mono"
            />
            <p className="text-[10px] text-neutral-500">
              Wait time before routing caller to secondary fallback carrier.
            </p>
          </div>

          {/* Business Hours */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Business Hours Window
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={routingRules.businessHoursStart}
                onChange={(e) => setRoutingRules({ ...routingRules, businessHoursStart: e.target.value })}
                className="w-1/2 text-xs font-bold p-2.5 bg-[#0a0a0a] border border-white/[0.05] text-white rounded-lg font-mono"
              />
              <span className="text-xs text-neutral-500">to</span>
              <input
                type="time"
                value={routingRules.businessHoursEnd}
                onChange={(e) => setRoutingRules({ ...routingRules, businessHoursEnd: e.target.value })}
                className="w-1/2 text-xs font-bold p-2.5 bg-[#0a0a0a] border border-white/[0.05] text-white rounded-lg font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-[10px] font-medium text-neutral-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={routingRules.businessHoursOnly}
                onChange={(e) => setRoutingRules({ ...routingRules, businessHoursOnly: e.target.checked })}
                className="w-3.5 h-3.5 accent-emerald-500"
              />
              <span>Enforce after-hours AI voicemail rule</span>
            </label>
          </div>
        </div>
      </div>

      {/* Add / Edit Number Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f12] border border-white/10 rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-base font-black uppercase tracking-tight text-white font-display">
                {editingId ? 'Edit Telephony Line' : 'Add New Phone Line'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNumber} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">
                  Phone Number (E.164 or Domestic format)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 08047281152 or +16624818479"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-black border border-white/10 text-white rounded-lg font-mono focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">
                  Label / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Inbound Support Line"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-black border border-white/10 text-white rounded-lg focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">
                    Carrier / Provider
                  </label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as any)}
                    className="w-full text-xs font-bold p-3 bg-black border border-white/10 text-white rounded-lg"
                  >
                    <option value="exotel">Exotel (India Domestic)</option>
                    <option value="twilio">Twilio (International)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs font-bold p-3 bg-black border border-white/10 text-white rounded-lg"
                  >
                    <option value="Active">Active</option>
                    <option value="Standby">Standby</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">
                  Routing Rule for this Line
                </label>
                <select
                  value={formRule}
                  onChange={(e) => setFormRule(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-black border border-white/10 text-white rounded-lg font-mono"
                >
                  <option value="always_active">always_active (Direct Inbound to AI)</option>
                  <option value="fallback_on_busy">fallback_on_busy (Ring only if primary line occupied)</option>
                  <option value="after_hours_only">after_hours_only (Active outside business hours)</option>
                  <option value="outbound_only">outbound_only (Dedicated campaign dialer line)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-100 shadow-md"
                >
                  {editingId ? 'Save Changes' : 'Add Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TabAdminNumbers;
