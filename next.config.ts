import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  crossOrigin: "anonymous",
};

module.exports = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "https://clarifyingly-cinchonic-abigail.ngrok-free.dev",
    "https://connectible-jeane-transfusive.ngrok-free.dev",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          "https://connectible-jeane-transfusive.ngrok-free.dev/api/:path*",
      },
    ];
  },
};

export default nextConfig;
