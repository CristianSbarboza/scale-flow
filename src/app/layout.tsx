import type { Metadata } from "next";
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
