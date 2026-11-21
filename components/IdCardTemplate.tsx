"use client";

import { forwardRef, useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * Kartu ID berbasis gambar template (DERMAGA).
 * Posisi elemen dinyatakan sebagai pecahan dari ukuran template (0..1) agar mudah disesuaikan
 * bila gambar template diganti dengan versi resolusi tinggi yang rasionya sama.
 */
export const ID_CARD_TEMPLATES = {
  peserta: "/img/idcard-dermaga-peserta.png",
  panitia: "/img/idcard-dermaga-panitia.png", 
} as const;

// Template sudah di-crop bersih: 680 x 960 px (rasio A6)
export const ID_CARD_WIDTH_CM = 10.5;
export const ID_CARD_HEIGHT_CM = +(ID_CARD_WIDTH_CM * (960 / 680)).toFixed(2);

const LAYOUT = {
  photo: { cx: 0.508, cy: 0.49, size: 0.3 }, // lingkaran di tengah kemudi
  nameBox: { left: 0.174, top: 0.812, width: 0.668, height: 0.122 }, // kotak pita di bawah
  qr: { right: 0.04, top: 0.025, sizeCm: 1.6 },
};

export interface IdCardTemplateData {
  nama: string;
  nomorUnik: string;
  nomorUrut?: number | string | null;
  foto?: string | null;
}

interface Props {
  data: IdCardTemplateData;
  template: string;
  /** Hilangkan bayangan saat dirender ke PDF */
  flat?: boolean;
}

const IdCardTemplate = forwardRef<HTMLDivElement, Props>(function IdCardTemplate({ data, template, flat }, ref) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current && data.nomorUnik) {
      QRCode.toCanvas(qrRef.current, data.nomorUnik, { width: 120, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    }
  }, [data.nomorUnik]);

  const { photo, nameBox, qr } = LAYOUT;
  const W = ID_CARD_WIDTH_CM;
  const H = ID_CARD_HEIGHT_CM;
  const photoCm = W * photo.size;
  const long = (data.nama || "").length > 22;

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
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <img
        src={template}
        alt=""
        crossOrigin="anonymous"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
      />

      {/* Foto di dalam kemudi */}
      <div
        style={{
          position: "absolute",
          left: `${photo.cx * W - photoCm / 2}cm`,
          top: `${photo.cy * H - photoCm / 2}cm`,
          width: `${photoCm}cm`,
          height: `${photoCm}cm`,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#fdf3df",
          border: "0.08cm solid #fff7e6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data.foto ? (
          <img src={data.foto} alt={data.nama} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "1.2cm", fontWeight: 800, color: "#2f4b7c" }}>{(data.nama || "?").charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Nama & nomor di dalam pita */}
      <div
        style={{
          position: "absolute",
          left: `${nameBox.left * W}cm`,
          top: `${nameBox.top * H}cm`,
          width: `${nameBox.width * W}cm`,
          height: `${nameBox.height * H}cm`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 0.15cm",
          color: "#1f2f4d",
          lineHeight: 1.1,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: long ? "0.42cm" : "0.55cm",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textTransform: "uppercase",
          }}
        >
          {data.nama}
        </div>
        <div style={{ marginTop: "0.08cm", fontSize: "0.3cm", fontWeight: 700, color: "#44546f" }}>
          {data.nomorUrut ? `NO. ${data.nomorUrut} • ` : ""}
          {data.nomorUnik}
        </div>
      </div>

      {/* QR verifikasi */}
      <div
        style={{
          position: "absolute",
          right: `${qr.right * W}cm`,
          top: `${qr.top * H}cm`,
          width: `${qr.sizeCm}cm`,
          height: `${qr.sizeCm}cm`,
          background: "#fff",
          borderRadius: "0.15cm",
          padding: "0.08cm",
          boxSizing: "border-box",
        }}
      >
        <canvas ref={qrRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
});

export default IdCardTemplate;
