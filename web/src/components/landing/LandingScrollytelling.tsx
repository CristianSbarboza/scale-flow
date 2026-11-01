"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Star } from "lucide-react";
import InteractivePhoneStage from "@/components/landing/InteractivePhoneStage";
import {
  MOMENTS,
  PRINCIPLES,
  PROFILE_CARDS,
  type PhoneSceneId,
} from "@/components/landing/landing-data";
import { cn } from "@/lib/cn";

export default function LandingScrollytelling() {
  const [activeScene, setActiveScene] = useState<PhoneSceneId>("role_admin");
  const chapterRefs = useRef<Map<PhoneSceneId, HTMLElement>>(new Map());

  useEffect(() => {
    const elements = Array.from(chapterRefs.current.values());
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const scene = entry.target.getAttribute("data-scene") as PhoneSceneId | null;
            if (scene) {
              setActiveScene(scene);
            }
          }
        }
      },
      {
        rootMargin: "-30% 0px -45% 0px",
        threshold: 0.15,
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlayMoment = (scene: PhoneSceneId) => {
    setActiveScene(scene);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document
        .getElementById("palco-celular")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-24 sm:px-8 lg:pt-16">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        {/* 1. HERO (Coluna esquerda no desktop, topo no mobile) */}
        <section
          aria-labelledby="hero-titulo"
          className="flex flex-col justify-center lg:col-span-7"
        >
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Gestão de escalas ministeriais · IA &amp; WhatsApp
          </p>

          <h1
            id="hero-titulo"
            className="mt-5 font-display text-5xl leading-[1.03] font-normal tracking-tight text-foreground sm:text-6xl xl:text-7xl"
          >
            A escala da igreja
            <br />
            feita em{" "}
            <em className="font-normal text-accent light:text-primary italic">paz.</em>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            O ScaleFlow é a casa compartilhada dos ministérios da sua igreja.{" "}
            <strong className="font-semibold text-foreground">
              Peça a escala conversando.
            </strong>{" "}
            A assistente Cale organiza os cultos, colhe a disponibilidade em um
            único link, avisa pelo WhatsApp e{" "}
            <strong className="font-semibold text-foreground">
              espera a sua palavra antes de publicar.
            </strong>
          </p>

          <p className="mt-6 flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
            />
            <span>
              O celular ao lado está vivo — alterne entre Admin, Líder, Servo e
              Coordenador
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
            >
              <span>Começar agora</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <a
              href="#perfis"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Play size={10} fill="currentColor" aria-hidden="true" />
              </span>
              <span>Conhecer os perfis</span>
            </a>
          </div>
        </section>

        {/* 2. PALCO DO CELULAR (Logo abaixo do Hero no mobile; sticky na direita durante toda a leitura no desktop) */}
        <div
          id="palco-celular"
          className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start"
        >
          <InteractivePhoneStage
            activeScene={activeScene}
            onSelectScene={setActiveScene}
          />
        </div>

        {/* 3. NARRATIVA: 01 A IDEIA + 02 PERFIS + 03 SEIS MOMENTOS */}
        <div className="space-y-28 lg:col-span-7 lg:pt-16">
          {/* 01 A ideia */}
          <section id="ideia" aria-labelledby="ideia-titulo" className="scroll-mt-24">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              <span className="text-primary italic">01</span> · A ideia
            </p>

            <h2
              id="ideia-titulo"
              className="mt-4 font-display text-3xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Metade de liderar um ministério é{" "}
              <em className="font-normal text-accent light:text-primary italic">
                organizar quem serve
              </em>{" "}
              — e lembrar todo mundo.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Cobrar respostas no grupo de mensagens. Cruzar horários na sexta à
              noite. Descobrir uma troca de última hora minutos antes da passagem
              de som. Planilhas dividem datas, mas não dividem a carga mental:
              alguém ainda precisa perguntar, montar e lembrar um por um. O
              ScaleFlow assume o trabalho operacional e devolve o tempo ao
              cuidado com as pessoas.
            </p>

            <div className="mt-10 divide-y divide-border border-y border-border">
              {PRINCIPLES.map((item) => (
                <div
                  key={item.numeral}
                  className="grid gap-3 py-6 sm:grid-cols-12 sm:gap-6"
                >
                  <span className="font-display text-xl text-primary italic sm:col-span-2">
                    {item.numeral}
                  </span>
                  <div className="sm:col-span-10">
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 02 Três perfis e um diferencial */}
          <section
            id="perfis"
            aria-labelledby="perfis-titulo"
            className="scroll-mt-24"
          >
            <div className="mb-12">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <span className="text-primary italic">02</span> · Três perfis e
                um diferencial
              </p>

              <h2
                id="perfis-titulo"
                className="mt-4 font-display text-3xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                Cada pessoa vê apenas{" "}
                <em className="font-normal text-accent light:text-primary italic">
                  o que precisa
                </em>{" "}
                para servir bem.
              </h2>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Toda a igreja compartilha a mesma base, mas cada acesso abre um
                ambiente sob medida — do administrador que enxerga todos os
                ministérios ao servo que confere sua agenda ou coordena o
                próprio setor. Role ou toque abaixo para testar cada perfil no
                celular ao lado.
              </p>
            </div>

            <div className="space-y-14 sm:space-y-16">
              {PROFILE_CARDS.map((card) => {
                const isActive = activeScene === card.sceneId;

                return (
                  <article
                    key={card.sceneId}
                    data-scene={card.sceneId}
                    ref={(el) => {
                      if (el) {
                        chapterRefs.current.set(card.sceneId, el);
                      } else {
                        chapterRefs.current.delete(card.sceneId);
                      }
                    }}
                    className={cn(
                      "relative transition-colors duration-300",
                      card.isDifferential
                        ? cn(
                            "rounded-3xl border p-6 sm:p-8",
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-primary/30 bg-card/60",
                          )
                        : cn(
                            "border-l-2 pl-6 sm:pl-8",
                            isActive ? "border-primary" : "border-border",
                          ),
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold",
                          card.isDifferential
                            ? "bg-primary text-primary-foreground"
                            : isActive
                              ? "border border-primary/40 bg-primary/15 text-primary"
                              : "border border-border bg-card text-foreground",
                        )}
                      >
                        {card.isDifferential && (
                          <Star size={11} fill="currentColor" aria-hidden="true" />
                        )}
                        {card.badge}
                      </span>
                      <span className="text-muted-foreground">
                        {card.accessWay}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
                      {card.title}
                    </h3>

                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {card.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {card.highlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayMoment(card.sceneId)}
                      className={cn(
                        "mt-5 inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                        isActive
                          ? "bg-foreground text-background"
                          : "border border-border bg-card text-foreground hover:border-primary/50",
                      )}
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play size={8} fill="currentColor" aria-hidden="true" />
                      </span>
                      <span>
                        {isActive
                          ? "Em exibição no celular"
                          : "Simular perfil no celular"}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 03 Seis momentos */}
          <section
            id="momentos"
            aria-labelledby="momentos-titulo"
            className="scroll-mt-24"
          >
            <div className="mb-12">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <span className="text-primary italic">03</span> · Seis momentos
              </p>
              <h2
                id="momentos-titulo"
                className="mt-4 font-display text-3xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                Role a página, e o celular acompanha.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Do rascunho criado com a Cale aos lembretes automáticos no
                WhatsApp: veja como cada etapa acontece na rotina real da igreja.
              </p>
            </div>

            <div className="space-y-16 sm:space-y-24">
              {MOMENTS.map((moment) => {
                const isActive = activeScene === moment.id;
                return (
                  <article
                    key={moment.id}
                    data-scene={moment.id}
                    ref={(el) => {
                      if (el) {
                        chapterRefs.current.set(moment.id, el);
                      } else {
                        chapterRefs.current.delete(moment.id);
                      }
                    }}
                    className={cn(
                      "relative border-l-2 pl-6 transition-colors duration-300 sm:pl-8",
                      isActive ? "border-primary" : "border-border",
                    )}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "font-display text-5xl leading-none font-normal transition-colors sm:text-6xl",
                          isActive ? "text-primary" : "text-muted-foreground/35",
                        )}
                      >
                        {moment.number}
                      </span>
                      <span className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {moment.roleLabel}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
                      {moment.title}
                    </h3>

                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {moment.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {moment.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayMoment(moment.id)}
                      className={cn(
                        "mt-5 inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                        isActive
                          ? "bg-foreground text-background"
                          : "border border-border bg-card text-foreground hover:border-primary/50",
                      )}
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play size={8} fill="currentColor" aria-hidden="true" />
                      </span>
                      <span>
                        {isActive ? "Em exibição no celular" : "Simular no celular"}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
