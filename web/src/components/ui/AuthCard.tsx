import Image from "next/image";
import Card from "@/components/ui/Card";

/**
 * Moldura das telas de autenticação: fundo em gradiente, card de vidro
 * centralizado e o cabeçalho com a marca.
 *
 * /login e /register eram clones um do outro daqui para cima — mesmo
 * gradiente, mesmo card, mesmo h1. Só a linha de apoio mudava.
 */
export default function AuthCard({
  subtitle,
  children,
}: {
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#ea580c,#000000)] light:bg-[radial-gradient(circle_at_top_left,#fff7ed,#f3f4f6)]">
      <Card glass className="animate-fade-in w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Image src="/logo-mark.png" alt="" width={56} height={56} className="mx-auto mb-3 rounded-xl" />
          <h1 className="mb-2 font-logo text-[2.5rem] tracking-[2px] text-primary">
            ScaleFlow
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}
