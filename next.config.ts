import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "alma4d.com.br",
        pathname: "/images/**",
      },
    ],
  },
  trailingSlash: false,
};

export default nextConfig;
