import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
        const tables = result.rows.map(r => r.name);
        return NextResponse.json({ 
            success: true, 
            url: process.env.TURSO_DATABASE_URL?.substring(0, 20) + "...", 
            tables 
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
