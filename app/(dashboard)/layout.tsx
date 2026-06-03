import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { db } from "@/lib/db";
import { generus, mandiri } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { checkMaintenance } from "@/lib/maintenance";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Maintenance Mode Check
  const isMaintenanceActive = await checkMaintenance();
  if (isMaintenanceActive) {
    redirect("/");
  }

  let userFoto = "";
  let isInMandiri = ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"].includes(session.role);

  if (session.generusId) {
    const res = await db.select({ foto: generus.foto }).from(generus).where(eq(generus.id, session.generusId)).limit(1);
    if (res.length > 0) userFoto = res[0].foto || "";
    
    if (!isInMandiri) {
      const mandiriRes = await db.select({ id: mandiri.id }).from(mandiri).where(eq(mandiri.generusId, session.generusId)).limit(1);
      isInMandiri = mandiriRes.length > 0;
    }
  }

  return (
    <div className="layout">
      <Sidebar user={{ name: session.name, email: session.email, role: session.role, foto: userFoto, isInMandiri }} />
      <main className="main-content">{children}</main>
    </div>
  );
}
