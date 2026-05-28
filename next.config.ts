import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "0.0.0.0",
    "0.0.0.0:81",
    "http://0.0.0.0:81",
    "http://0.0.0.0",
    "21.0.8.14",
    "21.0.8.14:81",
    "http://21.0.8.14:81",
    "http://21.0.8.14",
  ],
};

export default nextConfig;
