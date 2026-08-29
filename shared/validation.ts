import { z } from "zod";

// ── Admin 3 tingkat — daerah singleton implisit (tanpa pilih Daerah) ──
export const adminRoles = ["admin_daerah", "admin_desa", "admin_kelompok"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const pendidikanEnum = ["SD", "SMP", "SMA", "Sedang menempuh perguruan tinggi", "Sarjana"] as const;

export const kategoriMudaMudiEnum = ["perantauan", "pribumi"] as const;
export const kategoriAcaraEnum = ["sambung_rutin", "keakraban", "pemantapan", "lainnya"] as const;
export const hobiEnum = ["olahraga", "traveling", "seni", "musik", "kuliner", "teknologi", "literasi", "gaming", "lainnya"] as const;
export type HobiKey = (typeof hobiEnum)[number];

export const shiftModeEnum = ["tetap", "fleksibel"] as const;

export const shiftPekerjaanSchema = z.union([
  z.object({ mode: z.literal("tetap"), masuk: z.string().regex(/^\d{2}:\d{2}$/), pulang: z.string().regex(/^\d{2}:\d{2}$/) }),
  z.object({
    mode: z.literal("fleksibel"),
    shifts: z.array(z.object({ nama: z.string().min(1), masuk: z.string().regex(/^\d{2}:\d{2}$/), pulang: z.string().regex(/^\d{2}:\d{2}$/) })).min(1),
  }),
]);

// Admin mendaftarkan Generus (domisili terbalik: anak wajib, ortu kondisional)
export const generusAdminCreateSchema = z
  .object({
    nama: z.string().min(2).max(100).trim(),
    tempatLahir: z.string().min(2),
    tanggalLahir: z.string().min(1),
    noTelp: z.string().min(10).regex(/^\d+$/).trim(),
    pendidikan: z.enum(pendidikanEnum),
    jenisKelamin: z.enum(["L", "P"]),
    kategoriMudaMudi: z.enum(kategoriMudaMudiEnum).nullable().optional(),
    asalDaerah: z.string().nullable().optional(),
    domisiliAnak: z.string().min(3, "Domisili anak wajib diisi"),
    isDomisiliOrtuSama: z.boolean().default(true),
    domisiliOrtu: z.string().nullable().optional(),
    desaId: z.number().int().positive().nullable().optional(),
    kelompokId: z.number().int().positive().nullable().optional(),
    shiftPekerjaan: z.string().nullable().optional(), // JSON string P1 hidden
    statusOrtuJamaah: z.enum(["sudah", "belum"]).nullable().optional(), // P1
    foto: z.string().url().nullable().optional(),
    hobi: z.array(z.enum(hobiEnum)).max(8).nullable().optional(),
    hobiCustom: z.string().max(40).nullable().optional(),
    hobiDetail: z.string().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kategoriMudaMudi === "perantauan" && !v.asalDaerah?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Asal daerah wajib jika perantauan", path: ["asalDaerah"] });
    }
    if (!v.isDomisiliOrtuSama && !v.domisiliOrtu?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Domisili ortu wajib jika tidak sama dengan anak", path: ["domisiliOrtu"] });
    }
  });

export const kegiatanCreateSchema = z
  .object({
    judul: z.string().min(2).max(200),
    deskripsi: z.string().nullable().optional(),
    kategoriAcara: z.enum(kategoriAcaraEnum),
    kategoriCustom: z.string().nullable().optional(),
    tanggal: z.string().min(1),
    jam: z.string().nullable().optional(),
    lokasi: z.string().nullable().optional(),
    desaId: z.number().int().positive().nullable().optional(),
    kelompokId: z.number().int().positive().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    radiusM: z.number().int().positive().default(100),
    gpsRequired: z.number().int().min(0).max(1).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.kategoriAcara === "lainnya" && !v.kategoriCustom?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kategori custom wajib jika Lainnya", path: ["kategoriCustom"] });
    }
  });

export function sambungJudulTemplate(level: "daerah" | "desa" | "kelompok", namaWilayah: string): string {
  const tingkat = level === "daerah" ? "Daerah" : level === "desa" ? "Desa" : "Kelompok";
  const nama = level === "daerah" ? "" : ` ${namaWilayah}`;
  return `Sambung Muda-Mudi ${tingkat}${nama}`.trim();
}

export const pengurusLevelEnum = ["pimpinan", "sekretariat", "bidang", "koordinator"] as const;

export function slugify(judul: string): string {
  return judul.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
}

export const kegiatanPublikStatusEnum = ["draft", "pending_review", "published", "rejected"] as const;
export const kegiatanPublikSchema = z.object({
  judul: z.string().min(2).max(200).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120).optional(),
  excerpt: z.string().max(300).nullable().optional(),
  konten: z.string().max(20000).nullable().optional(),
  coverImage: z.string().url().nullable().optional().or(z.literal("")),
  kategori: z.string().max(60).default("Sambung Rutin"),
  kategoriAcara: z.enum(kategoriAcaraEnum).default("lainnya"),
  kategoriCustom: z.string().max(80).nullable().optional(),
  tanggal: z.string().min(1),
  jam: z.string().nullable().optional(),
  lokasi: z.string().max(200).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  status: z.enum(kegiatanPublikStatusEnum).default("draft"),
});

export const galeriSchema = z.object({
  judul: z.string().min(2).max(120).trim(),
  image: z.string().url().nullable().optional().or(z.literal("")),
  kategori: z.string().max(40).default("Kegiatan"),
  type: z.enum(["photo", "reel", "quote"]).default("photo"),
  aspectRatio: z.enum(["portrait", "landscape", "square", "tall"]).default("portrait"),
  deskripsi: z.string().max(2000).nullable().optional(),
  quote: z.string().max(500).nullable().optional(),
  author: z.string().max(100).nullable().optional(),
  durasi: z.string().max(20).nullable().optional(),
  tanggal: z.string().nullable().optional(),
  lokasi: z.string().max(120).nullable().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

export const tentangHtmlSchema = z.object({
  html: z.string().max(50000),
});

export const tentangJsonSchema = z.object({
  hero: z.object({
    kicker: z.string().default("Etalase Muda-Mudi Cengkareng"),
    title: z.string().default("Wadah kebersamaan &"),
    titleEm: z.string().default("pembinaan generus"),
    titleEnd: z.string().default("di Cengkareng."),
    lead: z.string().default("Ruang dokumentasi resmi kegiatan, syiar nilai budi pekerti, dan etalase karya generasi muda LDII Daerah Cengkareng — dari tingkat kelompok hingga daerah."),
    ctaPrimary: z.object({ label: z.string().default("Arsip kegiatan"), href: z.string().default("/kegiatan") }),
    ctaSecondary: z.object({ label: z.string().default("Struktur Pengurus"), href: z.string().default("/pengurus") }),
    meta: z.array(z.object({
      icon: z.enum(["sparkles", "users", "calendar"]).default("sparkles"),
      text: z.string(),
    })).default([
      { icon: "sparkles", text: "Etalase Dokumentasi" },
      { icon: "users", text: "Daerah Cengkareng" },
      { icon: "calendar", text: "Pembinaan Berkelanjutan" },
    ]),
    ghostText: z.string().default("LDII"),
    image: z.string().default("https://picsum.photos/seed/gencar-tentang-hero/900/900"),
    floatQuote: z.string().default("“Rukun, kompak, dan kerja sama yang baik.”"),
    floatAttribution: z.string().default("— Karakter Luhur"),
  }),
  letter: z.object({
    image: z.string().default("https://picsum.photos/seed/gencar-origin/700/800"),
    caption: z.string().default("Dokumentasi pembinaan berjenjang: dari kelompok, desa, hingga tingkat daerah Cengkareng."),
    heading: z.string().default("Dinamika Pembinaan & Sinergi Generus"),
    dropcapText: z.string().default("Pembinaan generasi muda di Cengkareng berakar dari pengajian rutin kelompok hingga kegiatan terpadu tingkat daerah. Setiap jenjang usia dirangkul melalui materi Al-Qur'an dan Al-Hadits yang aplikatif serta pembiasaan akhlak mulia."),
    paragraph2: z.string().default("Tujuan utama kami adalah mencetak generasi penerus yang memiliki Tri Sukses: alim dan faqih dalam ilmu agama, berakhlakul karimah dalam pergaulan, serta mandiri dalam mengarungi kehidupan bermasyarakat."),
    paragraph3: z.string().default("Laman web ini dihadirkan sebagai etalase publik yang transparan dan rapi. Seluruh dokumentasi kegiatan, artikel kepemudaan, dan karya warga tersaji agar menjadi inspirasi positif bagi sesama dan masyarakat luas."),
    quote: z.string().default("“Membina generus bukan sekadar program tahunan, melainkan ikhtiar berkesinambungan mencetak insan yang bermanfaat bagi agama, nusa, dan bangsa.”"),
    quoteCite: z.string().default("— Pembina Muda-Mudi Cengkareng"),
  }),
  manifesto: z.object({
    heading: z.string().default("Pondasi Pembinaan: Tri Sukses Generus"),
    subheading: z.string().default("Tiga target utama yang senantiasa ditanamkan dalam setiap kegiatan muda-mudi."),
    cards: z.array(z.object({
      num: z.string(),
      title: z.string(),
      body: z.string(),
      proof: z.string(),
      href: z.string(),
      isInk: z.boolean().optional(),
    })).default([
      { num: "01", title: "Alim & Faqih", body: "Paham Al-Qur'an dan Al-Hadits secara mendalam serta mengamalkannya dalam kehidupan sehari-hari.", proof: "Lihat kegiatan pembinaan →", href: "/kegiatan", isInk: true },
      { num: "02", title: "Berakhlakul Karimah", body: "Mempraktikkan budi pekerti luhur, beradab, santun kepada yang lebih tua, dan menyayangi sesama.", proof: "Baca artikel literasi →", href: "/artikel" },
      { num: "03", title: "Mandiri & Berdaya", body: "Memiliki keahlian nyata, etos kerja tangguh, dan kesiapan menghadapi tantangan zaman.", proof: "Cerita generus →", href: "#cerita" },
    ]),
  }),
  chronicle: z.object({
    heading: z.string().default("Pilar & Dimensi Pembinaan"),
    subheading: z.string().default("Fokus pengembangan potensi generasi muda se-Daerah Cengkareng."),
    items: z.array(z.object({
      year: z.string(),
      title: z.string(),
      desc: z.string(),
      image: z.string().optional(),
    })).default([
      { year: "Pembinaan", title: "Kajian & Sambung Rutin", desc: "Pengajian Al-Qur'an dan Al-Hadits berjenjang dari usia cabe rawit, pra-remaja, hingga muda-mudi di setiap kelompok.", image: "https://picsum.photos/seed/gencar-chrono-0/300/300" },
      { year: "Karakter", title: "6 Karakter Luhur", desc: "Penanaman tabiat jujur, amanah, hemat, rukun, kompak, dan kerja sama yang baik dalam interaksi harian.", image: "https://picsum.photos/seed/gencar-chrono-1/300/300" },
      { year: "Kemandirian", title: "Skill & Kemandirian", desc: "Pelatihan keterampilan wirausaha, teknologi, desain, hingga keputrian untuk mencetak generus mandiri.", image: "https://picsum.photos/seed/gencar-chrono-2/300/300" },
      { year: "Etalase", title: "Dokumentasi & Syiar", desc: "Ruang publik untuk mengarsipkan karya, dinamika positif, dan kontribusi nyata generus di Cengkareng.", image: "https://picsum.photos/seed/gencar-chrono-3/300/300" },
    ]),
  }),
  voices: z.object({
    heading: z.string().default("Cerita dari Lapangan"),
    subheading: z.string().default("Refleksi nyata dari muda-mudi, pembina, dan penggerak kegiatan di Cengkareng."),
    stories: z.array(z.object({
      nama: z.string(),
      peran: z.string(),
      angkatan: z.string(),
      foto: z.string(),
      quote: z.string(),
      konteks: z.string(),
    })).default([
      {
        nama: "Rafi — Generus Cengkareng Barat",
        peran: "Peserta Sambung Rutin",
        angkatan: "Muda-Mudi Cengkareng",
        foto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop/400/400",
        quote: "Sambung rutin bukan cuma nambah kepahaman agama, tapi juga tempat sharing ilmu praktis dan saling nguatin antar pemuda.",
        konteks: "Aktif membantu pencatatan notulensi dan koordinasi keakraban di tingkat kelompok.",
      },
      {
        nama: "Pak Bambang — Pembina Daerah",
        peran: "Dewan Penasihat / Pembina",
        angkatan: "Daerah Cengkareng",
        foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop/400/400",
        quote: "Generus yang berhasil adalah yang seimbang: paham agama, berakhlak mulia, dan punya keahlian mandiri untuk masa depannya.",
        konteks: "Mendampingi regenerasi kepengurusan muda-mudi agar terus kompak dan berkesinambungan.",
      },
      {
        nama: "Dimas — Koordinator Kegiatan",
        peran: "Pengurus Harian",
        angkatan: "Muda-Mudi Cengkareng Timur",
        foto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop/400/400",
        quote: "Kunci kegiatan generus itu rukun dan kompak. Dari kepanitiaan kecil sampai acara akbar, yang penting kerja sama yang baik.",
        konteks: "Mengkoordinasikan tim logistik dan teknis lapangan di setiap agenda daerah.",
      },
    ]),
  }),
  stats: z.object({
    items: z.array(z.object({
      target: z.number(),
      decimals: z.number().optional(),
      suffix: z.string().optional(),
      prefix: z.string().optional(),
      label: z.string(),
      variant: z.enum(["ink", "lime", "default"]).default("default"),
    })).default([
      { target: 48, label: "Kegiatan Terdokumentasi", variant: "ink" },
      { target: 1.2, decimals: 1, suffix: "k", label: "Muda-Mudi Terbina", variant: "default" },
      { target: 36, label: "Artikel & Risalah", variant: "lime" },
      { target: 12, label: "Pengurus & Koordinator", variant: "default" },
    ]),
    ctaText: z.string().default("Jelajahi arsip kegiatan terlaksana"),
    ctaHref: z.string().default("/kegiatan"),
  }),
  cta: z.object({
    heading: z.string().default("Etalase & Informasi Kepengurusan"),
    body: z.string().default("Untuk koordinasi internal, informasi jadwal kegiatan tingkat daerah, atau pertanyaan seputar dokumentasi publik generus Cengkareng, silakan hubungi perwakilan pengurus."),
    primaryLabel: z.string().default("Dokumentasi Kegiatan"),
    primaryHref: z.string().default("/kegiatan"),
    secondaryLabel: z.string().default("Pengurus Daerah"),
    secondaryHref: z.string().default("/pengurus"),
    image: z.string().default("https://picsum.photos/seed/gencar-cta/700/500"),
  }),
});

export type TentangJson = z.infer<typeof tentangJsonSchema>;

export const pengurusCreateSchema = z.object({
  nama: z.string().min(2).max(80).trim(),
  dapukan: z.string().min(2).max(80).trim(),
  foto: z.string().url().nullable().optional().or(z.literal("")),
  level: z.enum(pengurusLevelEnum).default("bidang"),
  bio: z.string().max(280).nullable().optional(),
  kontakWa: z.string().max(20).nullable().optional(),
  urutan: z.number().int().min(0).max(999).default(0),
});

export const profileRequestSectionEnum = ["kontak", "wilayah", "identitas"] as const;
export const profileChangeRequestSchema = z.object({
  section: z.enum(profileRequestSectionEnum),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).nullable()).refine((o) => Object.keys(o).length > 0, { message: "Payload minimal 1 field berubah" }),
  reason: z.string().min(10, "Alasan minimal 10 karakter").max(500),
  attachmentUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
