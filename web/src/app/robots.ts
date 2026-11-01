import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        // Protege áreas autenticadas e links compartilhados de escalas (`/escala/*`)
        // para que nunca apareçam indexados em mecanismos de busca.
        disallow: ["/admin/", "/servant/", "/escala/", "/api/", "/entrar"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

