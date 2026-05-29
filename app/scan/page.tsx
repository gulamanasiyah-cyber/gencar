"use client";
export const runtime = "edge";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import Swal from "sweetalert2";

export default function ScanPage() {
  const router = useRouter();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        if (!scanned) {
          setScanned(true);
          scanner.clear();
          
          if (decodedText.includes("hadir?kegiatanId=")) {
             if (decodedText.startsWith("http")) {
               window.location.href = decodedText;
             } else {
               router.push(decodedText);
             }
          } else {
             Swal.fire({
               icon: 'error',
               title: 'QR Code Tidak Valid',
               text: 'QR Code ini bukan QR Code absensi kegiatan.',
             }).then(() => {
               setScanned(false);
               window.location.reload();
             });
          }
        }
      },
      (error) => {
        // Ignore errors (happens when no QR found in frame)
      }
    );

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [scanned, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--navy)', padding: '16px', display: 'flex', alignItems: 'center', color: 'white' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Kembali
        </button>
      </div>

      <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px', width: '100%' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 8, color: 'var(--navy)', fontWeight: 800 }}>Scan QR Code</h2>
          <p style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '13px', marginBottom: 24 }}>Arahkan kamera ke QR Code kegiatan untuk mencatat kehadiran Anda secara otomatis.</p>
          
          <div id="qr-reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border)' }}></div>
        </div>
      </div>
      
      <style jsx global>{`
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { background: #000; }
        #qr-reader__dashboard_section_csr button {
          background: var(--primary) !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin: 4px !important;
        }
        #qr-reader__dashboard_section_swaplink {
          text-decoration: none !important;
          color: var(--primary) !important;
          font-weight: 600 !important;
          display: inline-block !important;
          margin-top: 10px !important;
        }
        #qr-reader a {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
