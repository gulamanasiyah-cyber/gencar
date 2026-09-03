import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Save } from "lucide-react";
import type { TentangJson } from "../../../../shared/validation";
import { apiFetch } from "../../lib/api";
import { PublicTentang } from "../../routes/public/PublicStatic";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import RichTextEditor from "../../components/admin/RichTextEditor";
import SplitPreviewLayout from "./SplitPreviewLayout";

const DEFAULT_TENTANG_DATA: TentangJson = {
  hero: {
    kicker: "Etalase Muda-Mudi Cengkareng",
    title: "Wadah kebersamaan &",
    titleEm: "pembinaan generus",
    titleEnd: "di Cengkareng.",
    lead: "Ruang dokumentasi resmi kegiatan, syiar nilai budi pekerti, dan etalase karya generasi muda LDII Daerah Cengkareng — dari tingkat kelompok hingga daerah.",
    ctaPrimary: { label: "Arsip kegiatan", href: "/kegiatan" },
    ctaSecondary: { label: "Struktur Pengurus", href: "/pengurus" },
    meta: [
      { icon: "sparkles", text: "Etalase Dokumentasi" },
      { icon: "users", text: "Daerah Cengkareng" },
      { icon: "calendar", text: "Pembinaan Berkelanjutan" },
    ],
    ghostText: "LDII",
    image: "https://picsum.photos/seed/gencar-tentang-hero/900/900",
    floatQuote: "“Rukun, kompak, dan kerja sama yang baik.”",
    floatAttribution: "— Karakter Luhur",
  },
  letter: {
    image: "https://picsum.photos/seed/gencar-origin/700/800",
    caption: "Dokumentasi pembinaan berjenjang: dari kelompok, desa, hingga tingkat daerah Cengkareng.",
    heading: "Dinamika Pembinaan & Sinergi Generus",
    dropcapText: "Pembinaan generasi muda di Cengkareng berakar dari pengajian rutin kelompok hingga kegiatan terpadu tingkat daerah. Setiap jenjang usia dirangkul melalui materi Al-Qur'an dan Al-Hadits yang aplikatif serta pembiasaan akhlak mulia.",
    paragraph2: "Tujuan utama kami adalah mencetak generasi penerus yang memiliki Tri Sukses: alim dan faqih dalam ilmu agama, berakhlakul karimah dalam pergaulan, serta mandiri dalam mengarungi kehidupan bermasyarakat.",
    paragraph3: "Laman web ini dihadirkan sebagai etalase publik yang transparan dan rapi. Seluruh dokumentasi kegiatan, artikel kepemudaan, dan karya warga tersaji agar menjadi inspirasi positif bagi sesama dan masyarakat luas.",
    quote: "“Membina generus bukan sekadar program tahunan, melainkan ikhtiar berkesinambungan mencetak insan yang bermanfaat bagi agama, nusa, dan bangsa.”",
    quoteCite: "— Pembina Muda-Mudi Cengkareng",
  },
  manifesto: {
    heading: "Pondasi Pembinaan: Tri Sukses Generus",
    subheading: "Tiga target utama yang senantiasa ditanamkan dalam setiap kegiatan muda-mudi.",
    cards: [
      { num: "01", title: "Alim & Faqih", body: "Paham Al-Qur'an dan Al-Hadits secara mendalam serta mengamalkannya dalam kehidupan sehari-hari.", proof: "Lihat kegiatan pembinaan →", href: "/kegiatan", isInk: true },
      { num: "02", title: "Berakhlakul Karimah", body: "Mempraktikkan budi pekerti luhur, beradab, santun kepada yang lebih tua, dan menyayangi sesama.", proof: "Baca artikel literasi →", href: "/artikel" },
      { num: "03", title: "Mandiri & Berdaya", body: "Memiliki keahlian nyata, etos kerja tangguh, dan kesiapan menghadapi tantangan zaman.", proof: "Cerita generus →", href: "#cerita" },
    ],
  },
  chronicle: {
    heading: "Pilar & Dimensi Pembinaan",
    subheading: "Fokus pengembangan potensi generasi muda se-Daerah Cengkareng.",
    items: [
      { year: "Pembinaan", title: "Kajian & Sambung Rutin", desc: "Pengajian Al-Qur'an dan Al-Hadits berjenjang dari usia cabe rawit, pra-remaja, hingga muda-mudi di setiap kelompok.", image: "https://picsum.photos/seed/gencar-chrono-0/300/300" },
      { year: "Karakter", title: "6 Karakter Luhur", desc: "Penanaman tabiat jujur, amanah, hemat, rukun, kompak, dan kerja sama yang baik dalam interaksi harian.", image: "https://picsum.photos/seed/gencar-chrono-1/300/300" },
      { year: "Kemandirian", title: "Skill & Kemandirian", desc: "Pelatihan keterampilan wirausaha, teknologi, desain, hingga keputrian untuk mencetak generus mandiri.", image: "https://picsum.photos/seed/gencar-chrono-2/300/300" },
      { year: "Etalase", title: "Dokumentasi & Syiar", desc: "Ruang publik untuk mengarsipkan karya, dinamika positif, dan kontribusi nyata generus di Cengkareng.", image: "https://picsum.photos/seed/gencar-chrono-3/300/300" },
    ],
  },
  voices: {
    heading: "Cerita dari Lapangan",
    subheading: "Refleksi nyata dari muda-mudi, pembina, dan penggerak kegiatan di Cengkareng.",
    stories: [
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
    ],
  },
  stats: {
    items: [
      { target: 48, label: "Kegiatan Terdokumentasi", variant: "ink" },
      { target: 1.2, decimals: 1, suffix: "k", label: "Muda-Mudi Terbina", variant: "default" },
      { target: 36, label: "Artikel & Risalah", variant: "lime" },
      { target: 12, label: "Pengurus & Koordinator", variant: "default" },
    ],
    ctaText: "Jelajahi arsip kegiatan terlaksana",
    ctaHref: "/kegiatan",
  },
  cta: {
    heading: "Etalase & Informasi Kepengurusan",
    body: "Untuk koordinasi internal, informasi jadwal kegiatan tingkat daerah, atau pertanyaan seputar dokumentasi publik generus Cengkareng, silakan hubungi perwakilan pengurus.",
    primaryLabel: "Dokumentasi Kegiatan",
    primaryHref: "/kegiatan",
    secondaryLabel: "Pengurus Daerah",
    secondaryHref: "/pengurus",
    image: "https://picsum.photos/seed/gencar-cta/700/500",
  },
};

export default function TentangTab() {
  const [data, setData] = useState<TentangJson>(DEFAULT_TENTANG_DATA);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  useEffect(() => {
    apiFetch<{ json?: any }>("/api/cms/tentang")
      .then((j) => {
        if (j?.json) {
          const parsed = typeof j.json === "string" ? JSON.parse(j.json) : j.json;
          setData(parsed);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/cms/tentang", { method: "PUT", body: JSON.stringify({ json: data }) });
      alert("Perubahan halaman Tentang berhasil disimpan.");
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
  };

  if (!loaded) return <div className="muted" style={{ padding: 16 }}>Memuat data Tentang...</div>;

  return (
    <div className="cms-tentang-container">
      {/* Top Toolbar */}
      <div className="cms-tentang-header">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Kelola Halaman Tentang</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Edit 7 seksi konten halaman publik <code>/tentang</code>. Form otomatis tersinkronisasi live 1:1.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/tentang" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink size={14} /> Web Publik
          </a>
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <SplitPreviewLayout
        storageKey="tentang"
        defaultSplit={50}
        form={(
          <div className="cms-tentang-form">
            {/* SEKSI 1: HERO */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(0)}>
                <span><strong>1. Hero Header</strong> &mdash; Judul Utama, Slogan, Tag &amp; Gambar</span>
                {openSection === 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 0 && (
                <div className="cms-section-card-body">
                  <div className="field">
                    <label>Kicker / Badge Atas</label>
                    <input
                      value={data.hero.kicker}
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, kicker: e.target.value } })}
                    />
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Judul Bagian Awal</label>
                      <input
                        value={data.hero.title}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, title: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Teks Highlight (Em/Aksen)</label>
                      <input
                        value={data.hero.titleEm}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, titleEm: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Judul Bagian Akhir</label>
                      <input
                        value={data.hero.titleEnd}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, titleEnd: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Deskripsi Lead</label>
                    <textarea
                      rows={3}
                      value={data.hero.lead}
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, lead: e.target.value } })}
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Tombol Utama (Label &amp; Link)</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          placeholder="Label"
                          value={data.hero.ctaPrimary.label}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, ctaPrimary: { ...data.hero.ctaPrimary, label: e.target.value } } })}
                        />
                        <input
                          placeholder="Href (/kegiatan)"
                          value={data.hero.ctaPrimary.href}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, ctaPrimary: { ...data.hero.ctaPrimary, href: e.target.value } } })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Tombol Kedua (Label &amp; Link)</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          placeholder="Label"
                          value={data.hero.ctaSecondary.label}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, ctaSecondary: { ...data.hero.ctaSecondary, label: e.target.value } } })}
                        />
                        <input
                          placeholder="Href (/pengurus)"
                          value={data.hero.ctaSecondary.href}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, ctaSecondary: { ...data.hero.ctaSecondary, href: e.target.value } } })}
                        />
                      </div>
                    </div>
                  </div>
                  <ImageUploadInput
                    label="Gambar Hero Utama"
                    value={data.hero.image}
                    onChange={(val) => setData({ ...data, hero: { ...data.hero, image: val } })}
                    placeholder="Pilih file gambar atau tempel URL..."
                  />
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Kutipan Mengambang (Floating Quote)</label>
                      <input
                        value={data.hero.floatQuote}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, floatQuote: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Atribusi Kutipan</label>
                      <input
                        value={data.hero.floatAttribution}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, floatAttribution: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEKSI 2: LETTER */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(1)}>
                <span><strong>2. Surat Pembina / Narasi</strong> &mdash; Foto Ilustrasi &amp; Artikel Sejarah</span>
                {openSection === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 1 && (
                <div className="cms-section-card-body">
                  <ImageUploadInput
                    label="Gambar Ilustrasi Narasi"
                    value={data.letter.image}
                    onChange={(val) => setData({ ...data, letter: { ...data.letter, image: val } })}
                    placeholder="Pilih file gambar atau tempel URL..."
                  />
                  <div className="field">
                    <label>Keterangan Gambar (Caption)</label>
                    <input
                      value={data.letter.caption}
                      onChange={(e) => setData({ ...data, letter: { ...data.letter, caption: e.target.value } })}
                    />
                  </div>
                  <div className="field">
                    <label>Judul Surat / Bagian</label>
                    <input
                      value={data.letter.heading}
                      onChange={(e) => setData({ ...data, letter: { ...data.letter, heading: e.target.value } })}
                    />
                  </div>
                  <div className="field">
                    <label>Paragraf 1 (Dengan Dropcap Awal)</label>
                    <RichTextEditor
                      value={data.letter.dropcapText}
                      onChange={(html) => setData({ ...data, letter: { ...data.letter, dropcapText: html } })}
                      placeholder="Tulis narasi awal..."
                      minHeight={100}
                    />
                  </div>
                  <div className="field">
                    <label>Paragraf 2</label>
                    <RichTextEditor
                      value={data.letter.paragraph2}
                      onChange={(html) => setData({ ...data, letter: { ...data.letter, paragraph2: html } })}
                      placeholder="Tulis narasi lanjutan..."
                      minHeight={100}
                    />
                  </div>
                  <div className="field">
                    <label>Paragraf 3</label>
                    <RichTextEditor
                      value={data.letter.paragraph3}
                      onChange={(html) => setData({ ...data, letter: { ...data.letter, paragraph3: html } })}
                      placeholder="Tulis narasi penutup..."
                      minHeight={100}
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Kutipan Highlight Pembina</label>
                      <textarea
                        rows={2}
                        value={data.letter.quote}
                        onChange={(e) => setData({ ...data, letter: { ...data.letter, quote: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Nama / Jabatan Pembina (Cite)</label>
                      <input
                        value={data.letter.quoteCite}
                        onChange={(e) => setData({ ...data, letter: { ...data.letter, quoteCite: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEKSI 3: MANIFESTO / TRI SUKSES */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(2)}>
                <span><strong>3. Pondasi &amp; Nilai</strong> &mdash; Tri Sukses Generus (3 Kartu)</span>
                {openSection === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 2 && (
                <div className="cms-section-card-body">
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Judul Seksi</label>
                      <input
                        value={data.manifesto.heading}
                        onChange={(e) => setData({ ...data, manifesto: { ...data.manifesto, heading: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Sub-judul</label>
                      <input
                        value={data.manifesto.subheading}
                        onChange={(e) => setData({ ...data, manifesto: { ...data.manifesto, subheading: e.target.value } })}
                      />
                    </div>
                  </div>
                  {data.manifesto.cards.map((card, i) => (
                    <div key={i} className="cms-sub-card">
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--primary)" }}>Kartu #{i + 1} ({card.num})</div>
                      <div className="form-grid-2">
                        <div className="field">
                          <label>Judul Nilai</label>
                          <input
                            value={card.title}
                            onChange={(e) => {
                              const cards = [...data.manifesto.cards];
                              cards[i] = { ...cards[i]!, title: e.target.value };
                              setData({ ...data, manifesto: { ...data.manifesto, cards } });
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Teks Bukti / Aksi</label>
                          <input
                            value={card.proof}
                            onChange={(e) => {
                              const cards = [...data.manifesto.cards];
                              cards[i] = { ...cards[i]!, proof: e.target.value };
                              setData({ ...data, manifesto: { ...data.manifesto, cards } });
                            }}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Deskripsi Nilai</label>
                        <textarea
                          rows={2}
                          value={card.body}
                          onChange={(e) => {
                            const cards = [...data.manifesto.cards];
                            cards[i] = { ...cards[i]!, body: e.target.value };
                            setData({ ...data, manifesto: { ...data.manifesto, cards } });
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>Link Target (contoh: /kegiatan, /artikel, #cerita)</label>
                        <input
                          value={card.href}
                          onChange={(e) => {
                            const cards = [...data.manifesto.cards];
                            cards[i] = { ...cards[i]!, href: e.target.value };
                            setData({ ...data, manifesto: { ...data.manifesto, cards } });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEKSI 4: CHRONICLE / PILAR */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(3)}>
                <span><strong>4. Pilar &amp; Dimensi</strong> &mdash; 4 Timeline Pembinaan</span>
                {openSection === 3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 3 && (
                <div className="cms-section-card-body">
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Judul Seksi</label>
                      <input
                        value={data.chronicle.heading}
                        onChange={(e) => setData({ ...data, chronicle: { ...data.chronicle, heading: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Sub-judul</label>
                      <input
                        value={data.chronicle.subheading}
                        onChange={(e) => setData({ ...data, chronicle: { ...data.chronicle, subheading: e.target.value } })}
                      />
                    </div>
                  </div>
                  {data.chronicle.items.map((item, i) => (
                    <div key={i} style={i > 0 ? { borderTop: "1px solid var(--line)", paddingTop: 14 } : {}}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--primary)", marginBottom: 10 }}>Pilar #{i + 1}</div>
                      <div className="form-grid-2">
                        <div className="field">
                          <label>Tag / Label Singkat</label>
                          <input
                            value={item.year}
                            onChange={(e) => {
                              const items = [...data.chronicle.items];
                              items[i] = { ...items[i]!, year: e.target.value };
                              setData({ ...data, chronicle: { ...data.chronicle, items } });
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Nama Pilar</label>
                          <input
                            value={item.title}
                            onChange={(e) => {
                              const items = [...data.chronicle.items];
                              items[i] = { ...items[i]!, title: e.target.value };
                              setData({ ...data, chronicle: { ...data.chronicle, items } });
                            }}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Deskripsi</label>
                        <textarea
                          rows={2}
                          value={item.desc}
                          onChange={(e) => {
                            const items = [...data.chronicle.items];
                            items[i] = { ...items[i]!, desc: e.target.value };
                            setData({ ...data, chronicle: { ...data.chronicle, items } });
                          }}
                        />
                      </div>
                      <ImageUploadInput
                        label="Gambar Ilustrasi"
                        value={item.image || ""}
                        onChange={(val) => {
                          const items = [...data.chronicle.items];
                          items[i] = { ...items[i]!, image: val };
                          setData({ ...data, chronicle: { ...data.chronicle, items } });
                        }}
                        placeholder="Pilih file gambar atau tempel URL..."
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEKSI 5: VOICES / CERITA */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(4)}>
                <span><strong>5. Cerita Lapangan</strong> &mdash; Testimoni Generus &amp; Pembina (3 Cerita)</span>
                {openSection === 4 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 4 && (
                <div className="cms-section-card-body">
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Judul Seksi</label>
                      <input
                        value={data.voices.heading}
                        onChange={(e) => setData({ ...data, voices: { ...data.voices, heading: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Sub-judul</label>
                      <input
                        value={data.voices.subheading}
                        onChange={(e) => setData({ ...data, voices: { ...data.voices, subheading: e.target.value } })}
                      />
                    </div>
                  </div>
                  {data.voices.stories.map((story, i) => (
                    <div key={i} className="cms-sub-card">
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--primary)" }}>
                        {i === 0 ? "⭐ Cerita Utama (Featured)" : `Cerita Samping #${i}`}
                      </div>
                      <div className="form-grid-3">
                        <div className="field">
                          <label>Nama Lengkap</label>
                          <input
                            value={story.nama}
                            onChange={(e) => {
                              const stories = [...data.voices.stories];
                              stories[i] = { ...stories[i]!, nama: e.target.value };
                              setData({ ...data, voices: { ...data.voices, stories } });
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Peran / Jabatan</label>
                          <input
                            value={story.peran}
                            onChange={(e) => {
                              const stories = [...data.voices.stories];
                              stories[i] = { ...stories[i]!, peran: e.target.value };
                              setData({ ...data, voices: { ...data.voices, stories } });
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Wilayah / Angkatan</label>
                          <input
                            value={story.angkatan}
                            onChange={(e) => {
                              const stories = [...data.voices.stories];
                              stories[i] = { ...stories[i]!, angkatan: e.target.value };
                              setData({ ...data, voices: { ...data.voices, stories } });
                            }}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Kutipan Cerita</label>
                        <textarea
                          rows={2}
                          value={story.quote}
                          onChange={(e) => {
                            const stories = [...data.voices.stories];
                            stories[i] = { ...stories[i]!, quote: e.target.value };
                            setData({ ...data, voices: { ...data.voices, stories } });
                          }}
                        />
                      </div>
                      <ImageUploadInput
                        label="Foto Profil"
                        value={story.foto}
                        onChange={(val) => {
                          const stories = [...data.voices.stories];
                          stories[i] = { ...stories[i]!, foto: val };
                          setData({ ...data, voices: { ...data.voices, stories } });
                        }}
                        placeholder="Pilih file foto atau tempel URL..."
                      />
                      <div className="field">
                        <label>Konteks Tambahan</label>
                        <input
                          value={story.konteks}
                          onChange={(e) => {
                            const stories = [...data.voices.stories];
                            stories[i] = { ...stories[i]!, konteks: e.target.value };
                            setData({ ...data, voices: { ...data.voices, stories } });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEKSI 6: STATS */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(5)}>
                <span><strong>6. Statistik Angka</strong> &mdash; 4 Indikator Dampak Pembinaan</span>
                {openSection === 5 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 5 && (
                <div className="cms-section-card-body">
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Teks Link Bawah</label>
                      <input
                        value={data.stats.ctaText}
                        onChange={(e) => setData({ ...data, stats: { ...data.stats, ctaText: e.target.value } })}
                      />
                    </div>
                    <div className="field">
                      <label>Tujuan Link</label>
                      <input
                        value={data.stats.ctaHref}
                        onChange={(e) => setData({ ...data, stats: { ...data.stats, ctaHref: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    {data.stats.items.map((st, i) => (
                      <div key={i} className="cms-sub-card">
                        <div style={{ fontWeight: 800, fontSize: 12, color: "var(--primary)" }}>Stat #{i + 1}</div>
                        <div className="form-grid-2">
                          <div className="field">
                            <label>Nilai Target</label>
                            <input
                              type="number"
                              step="any"
                              value={st.target}
                              onChange={(e) => {
                                const items = [...data.stats.items];
                                items[i] = { ...items[i]!, target: parseFloat(e.target.value) || 0 };
                                setData({ ...data, stats: { ...data.stats, items } });
                              }}
                            />
                          </div>
                          <div className="field">
                            <label>Suffix (contoh: k, +, %)</label>
                            <input
                              value={st.suffix || ""}
                              onChange={(e) => {
                                const items = [...data.stats.items];
                                items[i] = { ...items[i]!, suffix: e.target.value };
                                setData({ ...data, stats: { ...data.stats, items } });
                              }}
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label>Label</label>
                          <input
                            value={st.label}
                            onChange={(e) => {
                              const items = [...data.stats.items];
                              items[i] = { ...items[i]!, label: e.target.value };
                              setData({ ...data, stats: { ...data.stats, items } });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SEKSI 7: CTA BOTTOM */}
            <div className="cms-section-card">
              <button type="button" className="cms-section-card-head" onClick={() => toggle(6)}>
                <span><strong>7. Kotak Ajakan (CTA Bawah)</strong> &mdash; Kontak &amp; Penutup</span>
                {openSection === 6 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSection === 6 && (
                <div className="cms-section-card-body">
                  <div className="field">
                    <label>Judul Ajakan</label>
                    <input
                      value={data.cta.heading}
                      onChange={(e) => setData({ ...data, cta: { ...data.cta, heading: e.target.value } })}
                    />
                  </div>
                  <div className="field">
                    <label>Deskripsi Ajakan</label>
                    <textarea
                      rows={2}
                      value={data.cta.body}
                      onChange={(e) => setData({ ...data, cta: { ...data.cta, body: e.target.value } })}
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Tombol 1 (Label &amp; Link)</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          placeholder="Label"
                          value={data.cta.primaryLabel}
                          onChange={(e) => setData({ ...data, cta: { ...data.cta, primaryLabel: e.target.value } })}
                        />
                        <input
                          placeholder="Link"
                          value={data.cta.primaryHref}
                          onChange={(e) => setData({ ...data, cta: { ...data.cta, primaryHref: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Tombol 2 (Label &amp; Link)</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          placeholder="Label"
                          value={data.cta.secondaryLabel}
                          onChange={(e) => setData({ ...data, cta: { ...data.cta, secondaryLabel: e.target.value } })}
                        />
                        <input
                          placeholder="Link"
                          value={data.cta.secondaryHref}
                          onChange={(e) => setData({ ...data, cta: { ...data.cta, secondaryHref: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>
                  <ImageUploadInput
                    label="Gambar Penutup Ajakan"
                    value={data.cta.image}
                    onChange={(val) => setData({ ...data, cta: { ...data.cta, image: val } })}
                    placeholder="Pilih file gambar atau tempel URL..."
                  />
                </div>
              )}
            </div>
          </div>
        )}
        preview={(
          <div className="pub-section" style={{ padding: 0 }}>
            <PublicTentang data={data} />
          </div>
        )}
      />
    </div>
  );
}
