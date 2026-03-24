import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ✅ OBRIGATÓRIO para static export no App Router
  output: "export",
};

export default nextConfig;
