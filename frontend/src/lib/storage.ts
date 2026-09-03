import { apiFetch } from "./api";

/**
 * Upload image using direct Presigned PUT flow to R2
 */
export async function uploadImageDirect(file: File): Promise<{ key: string; viewUrl: string }> {
  // 1. Ask backend for presigned ticket
  const presign = await apiFetch<{
    key: string;
    uploadUrl: string;
    contentType: string;
    viewUrl: string;
  }>("/api/upload/presign", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "image/jpeg",
      fileSize: file.size,
    }),
  });

  // 2. Direct PUT file binary to R2
  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": presign.contentType,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Gagal upload langsung ke storage (${uploadRes.status})`);
  }

  return {
    key: presign.key,
    viewUrl: presign.viewUrl,
  };
}

/**
 * Get signed temporary view URL for a given image key
 */
export async function getSignedImageUrl(keyOrUrl: string, expiresInSeconds: number = 3600): Promise<string> {
  if (!keyOrUrl) return "";
  // If already an external URL or data URL, return as-is
  if (keyOrUrl.startsWith("http") && !keyOrUrl.includes("/api/images/")) return keyOrUrl;
  if (keyOrUrl.startsWith("data:")) return keyOrUrl;

  try {
    const res = await apiFetch<{ url: string; expiresAt: number }>(
      `/api/images/sign?key=${encodeURIComponent(keyOrUrl)}&expiresIn=${expiresInSeconds}`
    );
    return res.url || keyOrUrl;
  } catch {
    return keyOrUrl;
  }
}
