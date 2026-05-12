import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hide the floating "N" / build-activity indicator that Next.js shows in
  // dev mode — confuses event volunteers using the attendance scanner on a phone.
  devIndicators: false,
};

export default nextConfig;
