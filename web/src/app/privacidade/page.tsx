import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade e uso de dados do ScaleFlow.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Voltar ao ScaleFlow
        </Link>

        <h1 className="text-3xl font-bold">Política de Privacidade — ScaleFlow</h1>
        <p className="text-xs text-muted-foreground">
          Última atualização: Novembro de 2026
        </p>

        <section className="card glass space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            O <strong className="text-foreground">ScaleFlow</strong> é uma
            plataforma de gestão de escalas ministeriais para igrejas. Respeitamos a
            sua privacidade e utilizamos apenas os dados estritamente necessários para
            organizar escalas, disponibilidades e lembretes de culto.
          </p>

          <h2 className="text-base font-bold text-foreground">
            1. Dados coletados
          </h2>
          <p>
            Armazenamos nome, nome de usuário, telefone (opcional, para lembretes de
            escala via WhatsApp e login) e e-mail (opcional, para autenticação e
            vínculo com a conta Google).
          </p>

          <h2 className="text-base font-bold text-foreground">
            2. Integração com Conta Google e Google Agenda
          </h2>
          <p>
            Quando você opta voluntariamente por conectar sua conta Google nas
            Configurações ou entrar com o Google:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Utilizamos seu identificador e e-mail do Google exclusivamente para
              autenticar seu acesso ao ScaleFlow.
            </li>
            <li>
              Utilizamos a permissão de eventos do{" "}
              <strong className="text-foreground">Google Agenda</strong>{" "}
              (<code>calendar.events</code>) exclusivamente para criar, atualizar e
              remover na sua agenda os dias e horários em que você estiver escalado(a)
              para servir na sua igreja.
            </li>
            <li>
              O ScaleFlow não lê, não compartilha e não vende nenhum outro evento ou
              dado da sua conta Google para terceiros. Você pode desativar a
              sincronização ou desvincular sua conta Google a qualquer momento na
              página de Configurações.
            </li>
          </ul>

          <h2 className="text-base font-bold text-foreground">
            3. Exclusão de dados
          </h2>
          <p>
            Você pode desvincular sua conta Google diretamente nas Configurações do
            aplicativo ou solicitar a remoção da sua conta junto à liderança da sua
            igreja.
          </p>
        </section>
      </div>
    </div>
  );
}
