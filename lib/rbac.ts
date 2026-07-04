import { getSession, JWTPayload } from "@/lib/auth";
import { NextResponse } from "next/server";

type AllowedRole = JWTPayload["role"];

/**
 * RBAC helper — verifies the current session has one of the allowed roles.
 * Use in API Routes and Server Components to avoid boilerplate.
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
export async function requireRole(allowedRoles: AllowedRole[]): Promise<{
  session: JWTPayload | null;
  errorResponse: NextResponse | null;
}> {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized — sesi tidak valid atau sudah berakhir" },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(session.role)) {
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
