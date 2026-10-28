import { scoreColor } from "./labels";

interface ScoreRingProps {
  score: number | null;
  size?: number;
  label?: string;
}

/** Circular score gauge. Renders an empty ring with a dash when there is no score. */
export function ScoreRing({ score, size = 132, label }: ScoreRingProps) {
  const stroke = Math.max(8, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const color = score === null ? "var(--color-unknown)" : scoreColor(value);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score === null ? "No score" : `Score ${value} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-bold tabular-nums leading-none text-slate-900" style={{ fontSize: size / 3.4 }}>
            {score === null ? "—" : value}
          </div>
          {label && <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>}
        </div>
      </div>
    </div>
  );
}
