import type { NextConfig } from "next";

function deriveServerActionOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return "localhost:3000";
  try {
    return new URL(raw).host;
  } catch {
    return "localhost:3000";
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      allowedOrigins: [deriveServerActionOrigin()],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
