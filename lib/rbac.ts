import { getSession, JWTPayload } from "@/lib/auth";
import { NextResponse } from "next/server";

type AllowedRole = JWTPayload["role"];

/**
 * RBAC helper — verifies the current session has one of the allowed roles.
 * Use in API Routes and Server Components to avoid boilerplate.
 *
 * Features:
 *   - Session verification + role-based gating
 *   - Audit log for denied access attempts (console for now, swap with pino/DB)
 *
 * @example
 *   // In an API route:
 *   const { session, errorResponse } = await requireRole(["admin", "admin_romantic_room"]);
 *   if (errorResponse) return errorResponse;
 *   // session is guaranteed non-null here
 *
 * @example
 *   // In a Server Component:
 *   const { session } = await requireRole(["admin"]);
 *   if (!session) redirect("/login");
 */
export async function requireRole(
  allowedRoles: AllowedRole[],
  /** Optional context for audit logging */
  context?: { action?: string; resourceId?: string }
): Promise<{
  session: JWTPayload | null;
  errorResponse: NextResponse | null;
}> {
  const session = await getSession();

  if (!session) {
    console.warn(
      `[RBAC] Unauthorized access attempt | action=${context?.action || "unknown"}`
    );
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized — sesi tidak valid atau sudah berakhir" },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    console.warn(
      `[RBAC] Forbidden | userId=${session.userId} role=${session.role} ` +
      `requiredRoles=[${allowedRoles.join(",")}] action=${context?.action || "unknown"} ` +
      `resourceId=${context?.resourceId || "N/A"}`
    );
    return {
      session,
      errorResponse: NextResponse.json(
        { error: "Forbidden — Anda tidak memiliki akses ke resource ini" },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Quick boolean check — useful in Server Components where you don't
 * need an HTTP response, just a yes/no decision.
 *
 * @example
 *   const canManage = await hasRole(["admin", "admin_romantic_room"]);
 *   if (!canManage) redirect("/login");
 */
export async function hasRole(allowedRoles: AllowedRole[]): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return allowedRoles.includes(session.role);
}
