import type { Metadata } from "next";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingScrollytelling from "@/components/landing/LandingScrollytelling";
import LandingFaqAndFooter from "@/components/landing/LandingFaqAndFooter";
import { buildLandingJsonLd } from "@/components/landing/landing-data";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "ScaleFlow — A escala da igreja feita em paz",
  description:
    "Organize escalas de ministérios e voluntários sem planilhas: disponibilidade em um link, assistente de IA Cale, trocas entre servos e lembretes automáticos no WhatsApp.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "ScaleFlow",
    title: "ScaleFlow — A escala da igreja feita em paz",
    description:
      "Peça a escala conversando com a IA Cale, colha disponibilidades em um link e avise sua equipe automaticamente pelo WhatsApp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScaleFlow — A escala da igreja feita em paz",
    description:
      "Disponibilidade em um link, rascunhos inteligentes com IA, trocas entre servos e lembretes no WhatsApp.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const jsonLd = buildLandingJsonLd(siteUrl);

  return (
    <div id="topo" className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Dados estruturados JSON-LD para Google & Motores de IA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Atmosfera ambiente quente + granulado editorial sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="editorial-grain absolute inset-0 opacity-25" />
      </div>

      <LandingHeader />

      <main>
        <LandingScrollytelling />
      </main>

      <LandingFaqAndFooter />
    </div>
  );
}
