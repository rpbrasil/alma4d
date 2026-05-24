import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              
              script-src 
                'self' 
                'unsafe-inline' 
                'unsafe-eval' 
                https://challenges.cloudflare.com;

              style-src 
                'self' 
                'unsafe-inline';

              img-src 
                'self' 
                data: 
                blob: 
                https://*.heyzine.com
                https://api.pagar.me
                https://alma4d.com.br;

              connect-src 
                'self' 
                https://challenges.cloudflare.com
                https://*.supabase.co
                wss://*.supabase.co;

              frame-src 
                'self'
                https://challenges.cloudflare.com
                https://heyzine.com 
                https://*.heyzine.com;
            `
              .replace(/\n/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },

  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.pagar.me",
        pathname: "/**",
      },
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
