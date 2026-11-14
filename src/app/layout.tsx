import type { Metadata } from "next";
import { Space_Grotesk, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lunar Maps — Bilimsel Ay Keşif & İniş Değerlendirme Sistemi",
  description:
    "Google Maps ilhamlı interaktif Ay analiz platformu. NASA LRO LOLA ve Diviner verileri ile iniş sahası ve üs kurulum uygunluğu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${spaceGrotesk.variable} ${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden bg-[#0b0c10] text-[#202124]">
        {children}
      </body>
    </html>
  );
}
