
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Merriweather, Montserrat } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import ThemeConfig from "@/components/ThemeConfig";
import OneSignalInit from "@/components/OneSignalInit";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["300", "400", "700", "900"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | GENCAR",
    default: "GENCAR - Sistem Manajemen Generus Cengkareng",
  },
  description: "Sistem Manajemen Generus Cengkareng, Kegiatan, dan Absensi",
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
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${merriweather.variable} ${montserrat.variable}`} suppressHydrationWarning>
        <Suspense fallback={null}>
          <ThemeConfig />
          <OneSignalInit />
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
