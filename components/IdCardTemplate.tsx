"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";

/**
 * Kartu ID berbasis gambar template (DERMAGA, peserta & panitia).
 * Isi kartu: NOMOR URUT besar di tengah kemudi dan NAMA di pita bawah.
 * Nomor urut mengikuti aturan: laki-laki 1-199, perempuan 200 dst (ditentukan saat pendaftaran).
 * Posisi elemen dinyatakan sebagai pecahan dari ukuran template (0..1) agar mudah disesuaikan.
 */
export const ID_CARD_TEMPLATES = {
  peserta: "/img/idcard-dermaga-peserta.png",
  panitia: "/img/idcard-dermaga-panitia.png",
} as const;

// Template sudah di-crop bersih: 680 x 960 px (rasio A6)
export const ID_CARD_WIDTH_CM = 10.5;
export const ID_CARD_HEIGHT_CM = +(ID_CARD_WIDTH_CM * (960 / 680)).toFixed(2);

const LAYOUT = {
  wheel: { cx: 0.508, cy: 0.49, size: 0.3 }, // lingkaran putih di tengah kemudi
  nameBox: { left: 0.174, top: 0.812, width: 0.668, height: 0.122 }, // kotak pita di bawah
};

const FONT = "'Chewy', 'Baloo 2', 'Arial Rounded MT Bold', 'Impact', 'Arial Narrow', sans-serif";

// Hanya nomor urut & nama yang dipakai; properti lain pada objek peserta diabaikan.
export interface IdCardTemplateData {
  nama: string;
  nomorUrut?: number | string | null;
}

interface Props {
  data: IdCardTemplateData;
  template: string;
  /** Hilangkan bayangan saat dirender ke PDF */
  flat?: boolean;
}

/** Perkecil teks sampai muat di kotaknya (satu baris). */
function useFitText(deps: unknown[], maxCm: number, minCm: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = maxCm;
    el.style.fontSize = `${size}cm`;
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && size > minCm && guard++ < 40) {
      size -= 0.03;
      el.style.fontSize = `${size}cm`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const IdCardTemplate = forwardRef<HTMLDivElement, Props>(function IdCardTemplate({ data, template, flat }, ref) {
  const { wheel, nameBox } = LAYOUT;
  const W = ID_CARD_WIDTH_CM;
  const H = ID_CARD_HEIGHT_CM;
  const wheelCm = W * wheel.size;
  const nomor = data.nomorUrut ? String(data.nomorUrut) : "-";
  const nama = (data.nama || "").trim();

  const nomorRef = useFitText([nomor], 2.3, 1.2);
  const namaRef = useFitText([nama], 0.85, 0.4);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: `${W}cm`,
        height: `${H}cm`,
        overflow: "hidden",
        background: "#fff7e6",
        borderRadius: "4mm",
        boxShadow: flat ? "none" : "0 20px 50px rgba(0,0,0,0.3)",
        fontFamily: FONT,
      }}
    >
      <img
        src={template}
        alt=""
        crossOrigin="anonymous"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
      />

      {/* Nomor urut di tengah kemudi */}
      <div
        style={{
          position: "absolute",
          left: `${wheel.cx * W - wheelCm / 2}cm`,
          top: `${wheel.cy * H - wheelCm / 2}cm`,
          width: `${wheelCm}cm`,
          height: `${wheelCm}cm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={nomorRef}
          style={{
            width: "88%",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            fontWeight: 900,
            lineHeight: 1,
            color: "#3b2a14",
            letterSpacing: "-0.02em",
          }}
        >
          {nomor}
        </div>
      </div>

      {/* Nama di dalam pita */}
      <div
        style={{
          position: "absolute",
          left: `${nameBox.left * W}cm`,
          top: `${nameBox.top * H}cm`,
          width: `${nameBox.width * W}cm`,
          height: `${nameBox.height * H}cm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 0.3cm",
          boxSizing: "border-box",
        }}
      >
        <div
          ref={namaRef}
          style={{
            width: "100%",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#7a5a36",
          }}
        >
          {nama}
        </div>
      </div>
    </div>
  );
});

export default IdCardTemplate;
