import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return [
    { url: `${baseUrl}/`, priority: 1 },
    { url: `${baseUrl}/metodo`, priority: 0.9 },
    { url: `${baseUrl}/livro`, priority: 0.8 },
    { url: `${baseUrl}/app`, priority: 0.8 },
    { url: `${baseUrl}/oferta`, priority: 0.7 },
    { url: `${baseUrl}/download`, priority: 0.6 },
    { url: `${baseUrl}/sobre`, priority: 0.5 },
    { url: `${baseUrl}/contato`, priority: 0.4 },
  ];
}
