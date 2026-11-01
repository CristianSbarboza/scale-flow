import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Montserrat, Offside } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getSiteUrl } from "@/lib/site-url";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const offside = Offside({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-logo",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "ScaleFlow — A escala da igreja feita em paz",
    template: "%s | ScaleFlow",
  },
  description:
    "Plataforma de gestão de escalas ministeriais para igrejas: disponibilidade em um link, rascunhos inteligentes com a IA Cale, trocas entre servos e lembretes automáticos no WhatsApp.",
  keywords: [
    "escala de igreja",
    "gestão de ministérios",
    "escala de voluntários",
    "escala de louvor e mídia",
    "lembrete de escala whatsapp",
    "organização ministerial",
    "ScaleFlow",
  ],
  appleWebApp: {
    capable: true,
    title: "ScaleFlow",
    statusBarStyle: "black-translucent",
  },
  other: {
    // iOS < 16.4 only recognizes the Apple-prefixed tag; Next's `appleWebApp.capable`
    // emits the standard `mobile-web-app-capable` one, so this covers older iPhones too.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1b1a18" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${montserrat.className} ${offside.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
