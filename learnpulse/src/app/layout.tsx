import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PridePath — AI study games",
  description:
    "Upload your materials, play quiz modes, track wellness, and earn achievements.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Inline fallbacks: if Tailwind/CSS or hydration fails, never show a blank white canvas */
  const shellBg = "#070b14";
  const shellFg = "#e8eaef";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSans.variable} min-h-full bg-background`}
      style={{ backgroundColor: shellBg, minHeight: "100%" }}
    >
      <body
        className="min-h-screen bg-background font-sans antialiased text-foreground"
        style={{
          backgroundColor: shellBg,
          color: shellFg,
          minHeight: "100vh",
          margin: 0,
        }}
      >
        {children}
        <Toaster richColors position="bottom-right" offset={20} />
      </body>
    </html>
  );
}
