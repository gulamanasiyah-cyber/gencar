/**
 * ─── Secure API Route Guard ──────────────────────────────────────────
 *
 * Reusable utility that combines session verification, RBAC,
 * Zod payload validation, and input sanitization in one call.
 *
 * Usage:
 *   import { secureApiHandler } from "@/lib/secure-handler";
 *
 *   const bodySchema = z.object({ name: z.string().min(2).max(100) });
 *
 *   export async function POST(request: NextRequest) {
 *     return secureApiHandler(request, {
 *       allowedRoles: ["admin", "admin_romantic_room"],
 *       bodySchema,
 *       handler: async ({ session, body }) => {
 *         // body is typed, validated, and sanitized
 *         return NextResponse.json({ ok: true });
 *       },
 *     });
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, JWTPayload } from "@/lib/auth";
import { sanitizeObject } from "@/lib/sanitize";

interface SecureApiOptions<T> {
  /** Roles allowed to access this endpoint. Empty array = any authenticated user. */
  allowedRoles?: JWTPayload["role"][];
  /** Zod schema to validate the JSON body (optional for GET requests) */
  bodySchema?: z.ZodType<T>;
  /** Your handler — only invoked after all checks pass */
  handler: (ctx: {
    session: JWTPayload;
    body: T;
    request: NextRequest;
  }) => Promise<NextResponse>;
}

export async function secureApiHandler<T = unknown>(
  request: NextRequest,
  options: SecureApiOptions<T>
): Promise<NextResponse> {
  try {
    // ── 1. Verify session ──
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized — sesi tidak valid" },
        { status: 401 }
      );
    }

    // ── 2. Check role ──
    if (
      options.allowedRoles &&
      options.allowedRoles.length > 0 &&
      !options.allowedRoles.includes(session.role)
    ) {
      console.warn(
        `[SECURE_HANDLER] Forbidden | userId=${session.userId} role=${session.role} path=${request.nextUrl.pathname}`
      );
      return NextResponse.json(
        { error: "Forbidden — akses ditolak" },
        { status: 403 }
      );
    }

    // ── 3. Parse + validate + sanitize body ──
    let body: T = {} as T;
    if (options.bodySchema) {
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Body request tidak valid (bukan JSON)" },
          { status: 400 }
        );
      }

      // Sanitize string fields before validation
      if (rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)) {
        try {
          rawBody = sanitizeObject(rawBody as Record<string, unknown>);
        } catch (err: any) {
          // sanitizeObject throws on prompt injection detection
          return NextResponse.json(
            { error: err.message || "Input ditolak — konten mencurigakan terdeteksi" },
            { status: 400 }
          );
        }
      }

      const result = options.bodySchema.safeParse(rawBody);
      if (!result.success) {
        const firstError = result.error.issues[0];
        return NextResponse.json(
          {
            error: firstError?.message || "Validasi input gagal",
            details: result.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 }
        );
      }
      body = result.data;
    }

    // ── 4. Execute handler ──
    return await options.handler({ session, body, request });
  } catch (error) {
    console.error("[SECURE_HANDLER] Unhandled error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
