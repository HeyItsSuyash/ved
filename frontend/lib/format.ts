export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDateTime(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(value: string | number | Date | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function secondsBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

// Two-digit STD codes; other Indian landlines use three digits.
const TWO_DIGIT_STD = ['11', '20', '22', '33', '40', '44', '79', '80'];

/** "+912269855433" -> "+91 22 6985 5433", "+919839011111" -> "+91 98390 11111". */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const n = digits.slice(2);
    if (/^[6-9]/.test(n)) return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
    if (TWO_DIGIT_STD.includes(n.slice(0, 2))) return `+91 ${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
    return `+91 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return raw;
}
