import { useMemo } from 'react';

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#22c55e', '#ec4899'];

/** Lightweight CSS confetti burst (no library). */
export function Confetti({ count = 60 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.4,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit absolute top-0 block rounded-sm"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 0.45, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }}
        />
      ))}
    </div>
  );
}

/** Circular progress ring. */
export function Ring({ value, max, size = 96, stroke = 10, children }: { value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-white/25" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" className="fill-none stroke-white transition-all duration-700" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
