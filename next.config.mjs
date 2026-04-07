/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next.js from bundling Prisma (server-only)
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
