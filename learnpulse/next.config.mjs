/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * OneDrive on Windows can break the build folder (symlinks / readlink).
   * - Vercel / CI: `.next` (required)
   * - Local `next dev`: `.next` (custom distDir + hot reload often 404s `/_next/static/*`)
   * - Local `next build` + `next start`: `.next-local` unless PRIDEPATH_DIST_DIR is set
   */
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.NODE_ENV === "development"
      ? ".next"
      : (process.env.PRIDEPATH_DIST_DIR ?? ".next-local"),
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;
