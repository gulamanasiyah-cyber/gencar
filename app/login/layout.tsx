export const runtime = "edge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Masuk - JB2.ID" };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
