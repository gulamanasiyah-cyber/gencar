import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const result = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            passwordPlain: users.passwordPlain,
            role: users.role
        })
        .from(users)
        .where(inArray(users.role, ["tim_gambuh", "tim_pnkb"]));
        return NextResponse.json({ 
            success: true, 
            users: result 
        });
    } catch (error: any) {
        console.error("DEBUG-DB ERROR:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
