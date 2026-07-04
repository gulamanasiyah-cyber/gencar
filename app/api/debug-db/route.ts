export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        // Security: Only admin can access debug endpoint
        const session = await getSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const result = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
            // passwordPlain REMOVED — never expose credentials in API responses
        })
        .from(users)
        .where(inArray(users.role, ["tim_pnkb_gambuh", "tim_pnkb"]));
        return NextResponse.json({ 
            success: true, 
            users: result 
        });
    } catch (error: any) {
        console.error("DEBUG-DB ERROR:", error);
        // Security: Never expose stack traces to client
        return NextResponse.json({ 
            success: false, 
            error: "Terjadi kesalahan internal"
        }, { status: 500 });
    }
}
