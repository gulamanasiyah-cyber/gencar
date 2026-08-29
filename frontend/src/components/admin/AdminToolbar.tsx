import type { ReactNode } from "react";

export default function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar">{children}</div>;
}
