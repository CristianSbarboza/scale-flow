import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description: "Termos de Serviço da plataforma ScaleFlow.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Voltar ao ScaleFlow
        </Link>

        <h1 className="text-3xl font-bold">Termos de Serviço — ScaleFlow</h1>
        <p className="text-xs text-muted-foreground">
          Última atualização: Novembro de 2026
        </p>

        <section className="card glass space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Ao acessar e utilizar o <strong className="text-foreground">ScaleFlow</strong>,
            você concorda com os presentes Termos de Serviço destinados à organização
            de escalas ministeriais e voluntariado em igrejas.
          </p>

          <h2 className="text-base font-bold text-foreground">
            1. Uso da Plataforma
          </h2>
          <p>
            O acesso ao sistema é concedido pela administração ou liderança de cada
            igreja cadastrada. Cada usuário é responsável por manter a segurança de
            suas credenciais de acesso e por manter suas disponibilidades atualizadas.
          </p>

          <h2 className="text-base font-bold text-foreground">
            2. Notificações e Sincronização de Agenda
          </h2>
          <p>
            O envio de lembretes (no aplicativo, Web Push ou WhatsApp) e a
            sincronização com o Google Agenda são recursos opcionais voltados a
            auxiliar os voluntários no cumprimento de suas escalas.
          </p>

          <h2 className="text-base font-bold text-foreground">
            3. Disponibilidade
          </h2>
          <p>
            O ScaleFlow busca manter o serviço disponível continuamente, podendo
            realizar atualizações e melhorias periódicas para aprimorar a experiência
            das igrejas e ministérios.
          </p>
        </section>
      </div>
    </div>
  );
}
