import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "LearnPulse — AI study games",
  description:
    "Upload your materials, play quiz modes, track wellness, and earn achievements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 font-sans antialiased text-zinc-100">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
