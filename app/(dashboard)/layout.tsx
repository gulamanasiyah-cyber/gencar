import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { db } from "@/lib/db";
import { generus, mandiri } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { checkMaintenance } from "@/lib/maintenance";
import AccessDenied from "@/components/AccessDenied";

const VALID_DASHBOARD_ROLES = [
  "admin",
  "pengurus_daerah",
  "kmm_daerah",
  "desa",
  "kelompok",
  "generus",
  "peserta",
  "creator",
  "tim_pnkb",
  "admin_romantic_room",
  "admin_keuangan",
  "admin_kegiatan",
  "admin_pdkt",
  "usia_mandiri",
  "tim_pnkb_gambuh"
];

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

  // Broken Access Control check: Block users without a valid role
  if (!session.role || !VALID_DASHBOARD_ROLES.includes(session.role)) {
    return <AccessDenied />;
  }

  let userFoto = "";
  let isInMandiri = ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb_gambuh"].includes(session.role);

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

