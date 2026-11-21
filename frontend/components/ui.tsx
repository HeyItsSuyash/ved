import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx('bg-white border border-zinc-200 rounded-lg', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-200">
          <div>
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName ?? 'p-5'}>{children}</div>
    </section>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50',
        variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        variant === 'danger' && 'bg-white text-red-600 border border-zinc-300 hover:bg-red-50 hover:border-red-200',
        className
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

const fieldClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 ' +
  'focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 disabled:bg-zinc-50';

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(fieldClass, 'h-9', className)} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldClass, 'py-2 leading-relaxed', className)} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-zinc-100 text-zinc-700',
        tone === 'blue' && 'bg-blue-50 text-blue-700',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'amber' && 'bg-amber-50 text-amber-800',
        tone === 'red' && 'bg-red-50 text-red-700'
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'neutral' }: { tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-block size-2 rounded-full',
        tone === 'neutral' && 'bg-zinc-400',
        tone === 'blue' && 'bg-blue-600',
        tone === 'green' && 'bg-emerald-500',
        tone === 'amber' && 'bg-amber-500',
        tone === 'red' && 'bg-red-500'
      )}
    />
  );
}

export function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3.5">
      <div className="text-[13px] text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-zinc-500">{detail}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && <Icon className="size-6 text-zinc-400 mb-3" strokeWidth={1.75} />}
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      {description && <p className="mt-1 text-[13px] text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = 'red',
  children,
  onRetry,
}: {
  tone?: 'red' | 'amber' | 'green' | 'blue';
  children: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      role={tone === 'red' ? 'alert' : 'status'}
      className={cx(
        'flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-[13px]',
        tone === 'red' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'green' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-900'
      )}
    >
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline underline-offset-2 cursor-pointer shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-zinc-500">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export { cx };

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-blue-600' : 'bg-zinc-300'
      )}
    >
      <span
        className={cx(
          'inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
