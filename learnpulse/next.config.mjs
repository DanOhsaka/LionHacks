/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Default `.next` under OneDrive often breaks: files become non-symlinks, then Next’s
   * startup `readlink` on `.next/package.json` throws EINVAL. Use a separate folder name.
   * Run `npm run clean` and delete any stuck `.next` folder in Explorer if needed.
   */
  distDir: ".next-local",
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;
