import type { Metadata, Viewport } from "next";
import { Montserrat, Offside } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

const offside = Offside({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-logo"
});

export const metadata: Metadata = {
  title: "ScaleFlow | Gestão de Escalas Ministeriais",
  description: "Sistema premium para gestão de escalas e ministérios de igreja.",
  keywords: "igreja, escalas, ministérios, servos, gestão",
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
      <body className={`${montserrat.className} ${offside.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
