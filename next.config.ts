import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native/dynamic dependency used by the Prisma driver adapter.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
