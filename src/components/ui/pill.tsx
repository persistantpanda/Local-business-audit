import type { ReactNode } from "react";

export function Pill({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function DemoBadge() {
  return <Pill className="bg-violet-100 text-violet-800">Demo data</Pill>;
}
