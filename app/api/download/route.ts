import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Hanya host penyimpanan gambar milik aplikasi yang boleh diproxy (mencegah SSRF).
const ALLOWED_HOSTS = ["res.cloudinary.com"];
const MAX_BYTES = 15 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url).searchParams.get("url");
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Sumber file tidak diizinkan" }, { status: 400 });
    }

    // redirect manual: jangan ikuti pengalihan ke host lain
    const response = await fetch(parsed.toString(), { redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch the file" }, { status: response.status >= 300 && response.status < 400 ? 502 : response.status });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (!/^(image\/|application\/pdf)/i.test(contentType)) {
      return NextResponse.json({ error: "Tipe file tidak diizinkan" }, { status: 400 });
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return NextResponse.json({ error: "File terlalu besar" }, { status: 413 });
    const blob = await response.blob();
    if (blob.size > MAX_BYTES) return NextResponse.json({ error: "File terlalu besar" }, { status: 413 });

    const last = parsed.pathname.substring(parsed.pathname.lastIndexOf("/") + 1);
    const filename = (last || "download").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
