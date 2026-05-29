export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

// Max file size: 8 MB (in bytes)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah" }, { status: 400 });
    }

    // Validate MIME type or Extension
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(fileType);
    const isAllowedExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!isAllowedMime && !isAllowedExt) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${file.type || "unknown"}. Gunakan JPG, PNG, atau WEBP.` },
        { status: 400 }
      );
    }


    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maksimal 8 MB.` },
        { status: 400 }
      );
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "uploads",
          resource_type: "image",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto:good" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      public_id: (result as any).public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error details:", error);
    return NextResponse.json(
      {
        error: "Gagal mengupload foto ke Cloudinary: " + (error.message || "Unknown error"),
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
