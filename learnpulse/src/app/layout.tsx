import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
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
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/pridepath-lion.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
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
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSans.variable} min-h-full bg-background`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Script id="pridepath-theme-init" strategy="beforeInteractive">
          {`(function(){try{var raw=localStorage.getItem("pridepath-preferences");var theme="dark";if(raw){var p=JSON.parse(raw);if(p&&p.state&&p.state.theme)theme=p.state.theme;}var resolved=theme==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme;document.documentElement.setAttribute("data-theme",resolved);document.documentElement.style.colorScheme=resolved;}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`}
        </Script>
        <PreferencesProvider>
          {children}
          <Toaster richColors position="bottom-right" offset={20} />
        </PreferencesProvider>
      </body>
    </html>
  );
}
