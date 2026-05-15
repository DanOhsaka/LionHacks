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

const siteDescription = "Study smarter, play harder — turn your notes into quiz games.";

function siteUrl(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return new URL(`https://${vercel}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "PridePath",
    template: "%s · PridePath",
  },
  description: siteDescription,
  applicationName: "PridePath",
  icons: {
    icon: "/pridepath-lion.png",
    apple: "/pridepath-lion.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PridePath",
    title: "PridePath",
    description: siteDescription,
    images: [
      {
        url: "/pridepath-lion.png",
        width: 512,
        height: 512,
        alt: "PridePath lion logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "PridePath",
    description: siteDescription,
    images: ["/pridepath-lion.png"],
  },
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
