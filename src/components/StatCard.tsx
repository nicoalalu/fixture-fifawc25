import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  accent = "text-slate-100",
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={"text-2xl font-bold tabular-nums " + accent}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
      {children}
    </div>
  );
}
