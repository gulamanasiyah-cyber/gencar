
import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import ThemeConfig from "@/components/ThemeConfig";
import { Suspense } from "react";

const SITE_URL = "https://gencar.pintarsolusi.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | GENCAR",
    default: "GENCAR - Sistem Manajemen Generus Cengkareng",
  },
  description: "Sistem Manajemen Generus Cengkareng, Kegiatan, dan Absensi",
  openGraph: {
    title: "GENCAR - Sistem Manajemen Generus Cengkareng",
    description: "Sistem Manajemen Generus Cengkareng, Kegiatan, dan Absensi",
    url: SITE_URL,
    siteName: "GENCAR",
    images: [
      {
        url: `${SITE_URL}/img/logo-jb2.png`,
        width: 800,
        height: 600,
        alt: "Logo GENCAR",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GENCAR - Sistem Manajemen Generus Cengkareng",
    description: "Sistem Manajemen Generus Cengkareng, Kegiatan, dan Absensi",
    images: [`${SITE_URL}/img/logo-jb2.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700;900&family=Montserrat:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <ThemeConfig />
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
