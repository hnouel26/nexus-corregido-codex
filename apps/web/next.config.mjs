/** @type {import('next').NextConfig} */
const config = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@nexus/db", "@nexus/plugins"],
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "bullmq", "ioredis"] },
};
export default config;
