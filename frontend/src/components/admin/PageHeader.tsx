import type { ReactNode } from "react";

export default function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <div className="page-header-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
