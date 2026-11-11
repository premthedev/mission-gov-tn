import { createContext, useContext, type ReactNode } from 'react';
import type { Bi } from '../data/types';

export type LangMode = 'both' | 'ta' | 'en';
export const LangCtx = createContext<LangMode>('both');
export const useLang = () => useContext(LangCtx);

export function txt(v: Bi | string | undefined, mode: LangMode = 'both'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (mode === 'en') return v.en ?? v.ta ?? '';
  return v.ta ?? v.en ?? '';
}

/** Bilingual text: Tamil first, English underneath (setting-dependent). */
export function T({ v, className, inline }: { v?: Bi | string; className?: string; inline?: boolean }) {
  const mode = useLang();
  if (!v) return null;
  if (typeof v === 'string') return <span className={`whitespace-pre-line ${className ?? ''}`}>{v}</span>;
  const { ta, en } = v;
  if (mode === 'ta' || !en || ta === en) return <span className={`whitespace-pre-line ${className ?? ''}`}>{ta ?? en}</span>;
  if (mode === 'en' || !ta) return <span className={`whitespace-pre-line ${className ?? ''}`}>{en ?? ta}</span>;
  if (inline) return <span className={className}>{ta} <span className="opacity-60">· {en}</span></span>;
  return (
    <span className={`block ${className ?? ''}`}>
      <span className="block whitespace-pre-line">{ta}</span>
      <span className="mt-0.5 block whitespace-pre-line text-[0.85em] opacity-60">{en}</span>
    </span>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, className = '', type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-teal-700 text-white active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700',
    secondary: 'bg-white text-teal-800 ring-1 ring-teal-700/30 active:bg-teal-50 dark:bg-slate-800 dark:text-teal-200',
    ghost: 'text-teal-800 active:bg-teal-50 dark:text-teal-300 dark:active:bg-slate-800',
    danger: 'bg-rose-600 text-white active:bg-rose-700',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`min-h-12 rounded-2xl px-5 py-3 text-base font-semibold transition ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 ${className}`}>{children}</div>;
}

export function Bar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}>
      <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition ${
        active ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-xl px-4 pb-28 pt-4 ${className}`}>{children}</div>;
}

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-2 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      {onBack && (
        <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800" aria-label="Back">
          ←
        </button>
      )}
      <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
      {right}
    </div>
  );
}

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
