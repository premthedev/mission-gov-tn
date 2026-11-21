import type { StepKind } from '../engine/planner';

/** Small line-icon set (24×24, stroke = currentColor). No icon font or emoji, so it renders the same everywhere. */
const PATHS = {
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  book: 'M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5v-2ZM4 19.5A2.5 2.5 0 0 1 6.5 17H19M8 7h7M8 11h5',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  scroll: 'M8 3h10a2 2 0 0 1 2 2v12M8 3a2 2 0 0 0-2 2v14a2 2 0 0 1-2-2v-1h12v2a2 2 0 0 1-2 2H6M10 8h6M10 12h6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 10v4l2 2M9 2h6',
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6ZM14 3v6h6M8 13h8M8 17h5',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  check: 'M5 12.5 10 17 19 7',
  checkCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM8 12.5l3 3 5-6',
  xCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM15 9l-6 6M9 9l6 6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  right: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  sheet: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 11h8M8 15h5',
  flame: 'M12 22c4 0 7-2.8 7-7 0-4-3-6.5-4-9.5-2 1.5-3 3.5-3 5.5-1-1-1.5-2-1.5-3.5C8 9.5 5 12 5 15c0 4.2 3 7 7 7Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z',
  play: 'M7 4v16l13-8L7 4Z',
  lock: 'M6 11h12v10H6V11ZM8 11V7a4 4 0 1 1 8 0v4',
  news: 'M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5ZM17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  cards: 'M7 3h11a2 2 0 0 1 2 2v11M4 7h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  alert: 'M12 3 2 20h20L12 3ZM12 10v4M12 17h.01',
  language: 'M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 4-3 7-6 8M13 21l4-9 4 9M14.5 18h5',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  coach: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className = '', strokeWidth = 1.9 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

export const STEP_ICONS: Record<StepKind, IconName> = {
  WARMUP: 'bolt', KURAL_CARDS: 'scroll', REVIEW: 'repeat', LESSON: 'bulb', DRILL: 'target', SPEED: 'timer',
  SHORT_MOCK: 'file', MOCK: 'flag', WRAPUP: 'star', CHECKLIST: 'checkCircle', INFO: 'info',
};

/** Coloured round badge holding a step icon. */
export function StepBadge({ kind, done, active, size = 40 }: { kind: StepKind; done?: boolean; active?: boolean; size?: number }) {
  const tone = done
    ? 'bg-teal-600 text-white'
    : active
      ? 'bg-amber-400 text-slate-900'
      : 'bg-white text-teal-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-teal-300 dark:ring-slate-700';
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${tone}`} style={{ width: size, height: size }}>
      <Icon name={done ? 'check' : STEP_ICONS[kind]} size={Math.round(size * 0.5)} strokeWidth={done ? 2.6 : 1.9} />
    </span>
  );
}
