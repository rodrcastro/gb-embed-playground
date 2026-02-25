import type { NextConfig } from "next";

const strictBuildChecks = process.env.STRICT_BUILD_CHECKS === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    // Speed up deploy builds; run type checks separately via `npm run lint` / CI.
    ignoreBuildErrors: !strictBuildChecks,
  },
};

export default nextConfig;
