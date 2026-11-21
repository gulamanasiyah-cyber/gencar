
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/cache";
import { getClientIp } from "@/lib/request-ip";

// Cek isi file (magic bytes) agar ekstensi/MIME palsu tidak lolos
function looksLikeImage(b: Uint8Array): boolean {
  const eq = (o: number, sig: number[]) => sig.every((v, i) => b[o + i] === v);
  if (eq(0, [0xff, 0xd8, 0xff])) return true; // JPEG
  if (eq(0, [0x89, 0x50, 0x4e, 0x47])) return true; // PNG
  if (eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return true; // WEBP
  if (eq(4, [0x66, 0x74, 0x79, 0x70])) return true; // ISO-BMFF (HEIC/HEIF)
  return false;
}

// Max file size: 10 MB (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 64 * 1024;

// Allowed MIME types for photo uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/jpg", "image/pjpeg",
  "image/png", "image/x-png",
  "image/webp",
  "image/heic", "image/heif", "image/heic-sequence",
  "application/octet-stream" // Fallback for some mobile uploads
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(`upload:${getClientIp(request.headers)}`, 20, 60_000).success) {
      return NextResponse.json({ error: "Terlalu banyak unggahan. Coba lagi sebentar lagi." }, { status: 429 });
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10 MB." }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as any;

    if (!file || typeof file === "string" || !file.size) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah" }, { status: 400 });
    }

    // Validate MIME type or Extension
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(fileType);
    const isAllowedExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!isAllowedExt && !isAllowedMime) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${file.type || "unknown"}. Gunakan JPG, PNG, atau WEBP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 10 MB.` },
        { status: 400 }
      );
    }

    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!looksLikeImage(head)) {
      return NextResponse.json({ error: "Isi file bukan gambar yang valid" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Konfigurasi Cloudinary tidak ditemukan" }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const folder = "uploads";
    const transformation = "c_limit,h_800,w_800/q_auto:good";
    
    // Sort parameters alphabetically for signature: folder, timestamp, transformation
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`;
    
    // Generate SHA-1 signature using Edge Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("api_key", apiKey);
    cloudinaryFormData.append("timestamp", timestamp);
    cloudinaryFormData.append("signature", signature);
    cloudinaryFormData.append("folder", folder);
    cloudinaryFormData.append("transformation", transformation);
    
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    });

    const result = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(result.error?.message || "Gagal mengupload foto");
    }

    let secureUrl = result.secure_url;
    if (secureUrl && /\.(heic|heif)$/i.test(secureUrl)) {
      secureUrl = secureUrl.replace(/\.(heic|heif)$/i, ".jpg");
    }

    return NextResponse.json({
      success: true,
      url: secureUrl,
      public_id: result.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error details:", error);
    return NextResponse.json(
      {
        error: "Gagal mengupload foto. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
