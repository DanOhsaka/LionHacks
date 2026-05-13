/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * OneDrive on Windows can break the default `.next` folder (symlinks / readlink).
   * Use `.next-local` only for local dev; Vercel and CI must use `.next` (Vercel’s default).
   */
  distDir: process.env.VERCEL ? ".next" : ".next-local",
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;
