export const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;

export async function compressProfilePhoto(file: File, maxSizeMb = 10): Promise<File> {
  const maxBytes = Math.min(maxSizeMb * 1024 * 1024, MAX_PROFILE_PHOTO_SIZE);
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|hei[cf])/.test(file.type)) throw new Error("Gunakan foto JPG, PNG, WEBP, atau HEIC.");

  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  let source: Blob = file;
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  const image = await createImageBitmap(source);
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    let width = Math.max(1, Math.round(image.width * scale));
    let height = Math.max(1, Math.round(image.height * scale));

    while (true) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser tidak mendukung kompresi foto.");

      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      let lowerQuality = 0.5;
      let upperQuality = 0.85;
      let bestBlob: Blob | null = null;
      for (let attempt = 0; attempt < 7; attempt++) {
        const quality = (lowerQuality + upperQuality) / 2;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob) throw new Error("Gagal memproses foto di perangkat ini.");

        if (blob.size <= maxBytes) {
          bestBlob = blob;
          lowerQuality = quality;
        } else {
          upperQuality = quality;
        }
      }

      if (bestBlob) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-profil";
        return new File([bestBlob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }

      if (Math.max(width, height) <= 320) break;
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }

    throw new Error(`Ukuran foto tetap melebihi ${maxBytes / 1024 / 1024} MB setelah dikompres.`);
  } finally {
    image.close();
  }
}

