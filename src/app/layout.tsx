import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lunar Landing Site Navigator — NASA Space Apps Challenge 2026",
  description:
    "Google Maps-inspired scientific lunar landing site assessment and environmental navigator using NASA LRO LOLA, Diviner, and JPL Horizons ephemeris.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full w-full overflow-hidden bg-[#0b0c10] text-[#f4f4f6] font-sans">
        {children}
      </body>
    </html>
  );
}
