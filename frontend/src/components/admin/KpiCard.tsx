import type { ReactNode } from "react";

export default function KpiCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="kpi-card kpi-card--inline">
      {icon}
      <div>
        <div className="muted">{label}</div>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
