/**
 * Resolve a URL pública base da aplicação para metadados canônicos, sitemap,
 * robots.txt e dados estruturados JSON-LD.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    process.env.NEXTAUTH_URL ||
    "https://scaleflow.app";

  return raw.replace(/\/+$/, "");
}

