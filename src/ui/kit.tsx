import { createContext, useContext, type ReactNode } from 'react';
import type { Bi } from '../data/types';
import { Icon } from './icons';

/** 'ta' = Tamil only (default; English shown only where no Tamil exists), 'both' = Tamil with English below, 'en'. */
export type LangMode = 'both' | 'ta' | 'en';
export const LangCtx = createContext<LangMode>('ta');
export const useLang = () => useContext(LangCtx);

export function txt(v: Bi | string | undefined, mode: LangMode = 'ta'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (mode === 'en') return v.en || v.ta || '';
  return v.ta || v.en || '';
}

/** True when the text has an English version that differs from the Tamil one. */
export const hasEnglish = (v?: Bi) => !!v?.en && !!v.ta && v.en.trim() !== v.ta.trim();

/** Bilingual text: Tamil first; English underneath only in 'both' mode. */
export function T({ v, className, inline }: { v?: Bi | string; className?: string; inline?: boolean }) {
  const mode = useLang();
  if (!v) return null;
  if (typeof v === 'string') return <span className={`whitespace-pre-line ${className ?? ''}`}>{v}</span>;
  const ta = v.ta?.trim() ? v.ta : undefined;
  const en = v.en?.trim() ? v.en : undefined;
  if (mode === 'ta' || !en || ta === en) return <span className={`whitespace-pre-line ${className ?? ''}`}>{ta ?? en}</span>;
  if (mode === 'en' || !ta) return <span className={`whitespace-pre-line ${className ?? ''}`}>{en ?? ta}</span>;
  if (inline) return <span className={className}>{ta} <span className="opacity-60">· {en}</span></span>;
  return (
    <span className={`block ${className ?? ''}`}>
      <span className="block whitespace-pre-line">{ta}</span>
      <span className="mt-1 block whitespace-pre-line border-l-2 border-slate-300 pl-2 text-[0.88em] text-slate-500 dark:border-slate-600 dark:text-slate-400">{en}</span>
    </span>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, className = '', type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'light';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-teal-700 text-white shadow-sm shadow-teal-900/20 active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700',
    success: 'bg-emerald-600 text-white shadow-sm active:bg-emerald-700',
    secondary: 'bg-white text-teal-800 ring-1 ring-teal-700/25 active:bg-teal-50 disabled:opacity-50 dark:bg-slate-800 dark:text-teal-200 dark:ring-teal-400/30',
    ghost: 'text-teal-800 active:bg-teal-50 dark:text-teal-300 dark:active:bg-slate-800',
    danger: 'bg-rose-600 text-white shadow-sm active:bg-rose-700',
    light: 'bg-white text-teal-900 shadow-sm active:bg-teal-50 disabled:opacity-70',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold transition active:scale-[0.98] ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700 ${className}`}>{children}</div>;
}

export function Bar({ value, max, className = '', tone = 'bg-teal-600' }: { value: number; max: number; className?: string; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition ${
        active ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

/** Small labelled heading used inside cards. */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 ${className}`}>{children}</div>;
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-xl px-4 pb-28 pt-4 ${className}`}>{children}</div>;
}

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-1 border-b border-slate-200/80 bg-slate-50/90 px-2 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      {onBack && (
        <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full active:bg-slate-200 dark:active:bg-slate-800" aria-label="Back">
          <Icon name="back" size={24} />
        </button>
      )}
      <div className="min-w-0 flex-1 truncate px-1 text-base font-semibold">{title}</div>
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
