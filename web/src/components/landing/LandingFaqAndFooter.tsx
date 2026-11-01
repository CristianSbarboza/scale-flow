import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/components/landing/landing-data";

export default function LandingFaqAndFooter() {
  return (
    <>
      {/* 04 Perguntas Frequentes (HTML semântico indexável por crawlers sem JS) */}
      <section
        id="faq"
        aria-labelledby="faq-titulo"
        className="scroll-mt-24 border-t border-border/80 py-24"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <span className="text-primary italic">04</span> · Perguntas
                frequentes
              </p>
              <h2
                id="faq-titulo"
                className="mt-4 font-display text-3xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-4xl"
              >
                Tudo o que sua liderança precisa saber antes do{" "}
                <em className="font-normal text-accent light:text-primary italic">
                  próximo mês.
                </em>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Do primeiro cadastro de ministério aos lembretes automáticos no
                WhatsApp da equipe.
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border lg:col-span-7">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground transition-colors hover:text-primary">
                    <span>{item.question}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary"
                    />
                  </summary>
                  <p className="mt-3 pr-6 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé Editorial */}
      <footer
        aria-labelledby="rodape-titulo"
        className="border-t border-border/80 pt-20 pb-14"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p
            id="rodape-titulo"
            className="max-w-3xl font-display text-4xl leading-[1.08] font-normal tracking-tight text-foreground sm:text-6xl"
          >
            Menos tempo cobrando presença.
            <br />
            <em className="font-normal text-accent light:text-primary italic">
              Mais tempo cuidando de pessoas.
            </em>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <span>Entrar no ScaleFlow</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a
              href="#momentos"
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              Rever demonstração ao vivo
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-mark.png"
                alt=""
                width={22}
                height={22}
                className="rounded-md border border-card-border"
              />
              <span>
                <strong className="font-semibold text-foreground">ScaleFlow</strong>{" "}
                · Gestão de Escalas Ministeriais · 2026
              </span>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <Link href="/login" className="transition-colors hover:text-foreground">
                Acessar conta
              </Link>
              <a href="#topo" className="transition-colors hover:text-foreground">
                Voltar ao topo ↑
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
