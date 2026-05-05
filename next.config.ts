import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "alma4d.com.br",
        pathname: "/images/**",
      },
    ],
  },

  reactCompiler: true,
  trailingSlash: true,
};

export default nextConfig;
