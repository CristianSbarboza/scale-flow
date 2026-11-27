"use client";

import { motion } from "framer-motion";
import {
  Crown,
  Flame,
  Gift,
  Medal,
  Sparkles,
  Trophy,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { QuizDashboardData, QuizRankingEntry } from "@/lib/actions/quiz";

interface QuizRankingBoardProps {
  data: QuizDashboardData;
  showSelfHighlight?: boolean;
}

export default function QuizRankingBoard({
  data,
  showSelfHighlight = true,
}: QuizRankingBoardProps) {
  const first = data.ranking[0] ?? null;
  const second = data.ranking[1] ?? null;
  const third = data.ranking[2] ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Banner da Temporada Mensal */}
      <div className="card glass relative overflow-hidden p-4 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--primary)" }}
        />
        <div className="relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
              <Sparkles size={14} />
              <span>Temporada · {data.monthLabel}</span>
            </div>
            <h3 className="text-base font-extrabold text-foreground sm:text-lg">
              Ciclo Mensal: Dia 01 ao dia {data.totalDaysInMonth}
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              O ranking reúne todos os servos da igreja e reinicia todo dia 1º. Se ficar 1 dia sem entrar, os pontos acumulados zeram.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-foreground">
              <CalendarClock size={14} className="text-primary" />
              <span>
                {data.daysRemaining === 0
                  ? "Último dia do mês!"
                  : `Faltam ${data.daysRemaining} ${data.daysRemaining === 1 ? "dia" : "dias"}`}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Gift size={14} />
              <span>Prêmios do mês em breve</span>
            </div>
          </div>
        </div>
      </div>

      {/* Palco em Círculo dos 3 Primeiros Colocados */}
      <div className="card glass relative overflow-hidden px-3 py-6 sm:px-6 sm:py-8">
        {/* Foco de luz circular de palco atrás do Top 3 */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            width: "340px",
            height: "340px",
            background:
              "radial-gradient(circle, var(--primary) 0%, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full border border-primary/15"
          style={{ width: "310px", height: "310px" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-full border border-primary/10"
          style={{ width: "230px", height: "230px" }}
        />

        <div className="relative z-10 mb-6 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-wider text-primary uppercase">
            <Trophy size={13} />
            Palco dos 3 Primeiros
          </span>
        </div>

        <div className="relative z-10 mx-auto grid max-w-xl grid-cols-3 items-end gap-2 sm:gap-6">
          {/* 2º Lugar (Esquerda) */}
          <PodiumCircleSpot
            place={2}
            entry={second}
            showSelfHighlight={showSelfHighlight}
          />

          {/* 1º Lugar (Centro em destaque elevado) */}
          <PodiumCircleSpot
            place={1}
            entry={first}
            showSelfHighlight={showSelfHighlight}
          />

          {/* 3º Lugar (Direita) */}
          <PodiumCircleSpot
            place={3}
            entry={third}
            showSelfHighlight={showSelfHighlight}
          />
        </div>
      </div>

      {/* Lista Completa do Ranking entre Todos os Servos */}
      <div className="card glass overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2">
            <Medal size={18} className="text-primary" />
            <h4 className="text-sm font-bold text-foreground sm:text-base">
              Classificação Geral dos Servos ({data.ranking.length})
            </h4>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Pontos no mês
          </span>
        </div>

        {data.ranking.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum servo ativo encontrado nesta igreja.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.ranking.map((entry, idx) => {
              const highlightSelf = showSelfHighlight && entry.isSelf;
              const isTop3 = entry.position <= 3;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(idx * 0.025, 0.25),
                  }}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors sm:px-5 ${
                    highlightSelf
                      ? "bg-primary/12"
                      : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Medalha/Posição Circular */}
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        entry.position === 1
                          ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50"
                          : entry.position === 2
                            ? "bg-slate-300/20 text-slate-200 ring-1 ring-slate-300/50"
                            : entry.position === 3
                              ? "bg-amber-700/25 text-amber-400 ring-1 ring-amber-600/50"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {entry.position}º
                    </div>

                    <Avatar
                      name={entry.name}
                      color={entry.color}
                      icon={entry.avatarIcon}
                      size="md"
                      className={
                        isTop3
                          ? "ring-2 ring-primary/50"
                          : "ring-1 ring-border"
                      }
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-foreground">
                          {entry.name}
                        </span>
                        {highlightSelf && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                            Você
                          </span>
                        )}
                        {entry.playedToday && (
                          <span
                            title="Entrou hoje"
                            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                          >
                            <CheckCircle2 size={10} />
                            Hoje
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{entry.sectorSummary}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-400">
                          <Flame size={12} />
                          {entry.streakDays}d
                        </span>
                        <span className="hidden sm:inline">
                          · {entry.correctCount}{" "}
                          {entry.correctCount === 1 ? "acerto" : "acertos"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-sm font-extrabold text-foreground sm:text-base">
                      {entry.points}{" "}
                      <span className="text-xs font-semibold text-primary">
                        pts
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground sm:hidden">
                      {entry.correctCount}{" "}
                      {entry.correctCount === 1 ? "acerto" : "acertos"}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCircleSpot({
  place,
  entry,
  showSelfHighlight,
}: {
  place: 1 | 2 | 3;
  entry: QuizRankingEntry | null;
  showSelfHighlight: boolean;
}) {
  const isFirst = place === 1;

  const ringStyle =
    place === 1
      ? {
          borderColor: "#fbbf24",
          boxShadow:
            "0 0 0 4px rgba(251, 191, 36, 0.22), 0 0 32px rgba(251, 191, 36, 0.45)",
        }
      : place === 2
        ? {
            borderColor: "#cbd5e1",
            boxShadow:
              "0 0 0 3px rgba(203, 213, 225, 0.18), 0 0 22px rgba(203, 213, 225, 0.25)",
          }
        : {
            borderColor: "#d97706",
            boxShadow:
              "0 0 0 3px rgba(217, 119, 6, 0.18), 0 0 22px rgba(217, 119, 6, 0.25)",
          };

  const badgeBg =
    place === 1
      ? "bg-amber-400 text-slate-950"
      : place === 2
        ? "bg-slate-200 text-slate-950"
        : "bg-amber-600 text-white";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 24,
        delay: place === 1 ? 0.05 : place === 2 ? 0.12 : 0.18,
      }}
      className={`flex flex-col items-center text-center ${
        isFirst ? "-translate-y-3 sm:-translate-y-4" : ""
      }`}
    >
      {/* Coroa do 1º Lugar */}
      <div className="mb-2 flex h-6 items-center justify-center">
        {isFirst && (
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center rounded-full bg-amber-400/20 p-1.5 text-amber-300 ring-1 ring-amber-400/40"
          >
            <Crown size={18} />
          </motion.div>
        )}
      </div>

      {/* Palco Circular com Halo Luminoso */}
      <div className="relative mb-3 flex items-center justify-center">
        <div
          className={`relative flex items-center justify-center rounded-full border-2 bg-card/80 p-1.5 transition-transform ${
            isFirst ? "size-24 sm:size-28" : "size-19 sm:size-22"
          }`}
          style={ringStyle}
        >
          {entry ? (
            <Avatar
              name={entry.name}
              color={entry.color}
              icon={entry.avatarIcon}
              size={isFirst ? "xl" : "lg"}
              className={
                isFirst
                  ? "size-20! text-2xl! sm:size-24!"
                  : "size-15! text-lg! sm:size-18!"
              }
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-full bg-secondary/60 text-xs font-bold text-muted-foreground">
              —
            </div>
          )}

          {/* Selo circular do 1º / 2º / 3º lugar */}
          <span
            className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-black shadow-md ${badgeBg}`}
          >
            {place}º
          </span>
        </div>
      </div>

      {/* Nome, Setor e Pontuação */}
      {entry ? (
        <div className="mt-1 flex max-w-full flex-col items-center">
          <div className="flex max-w-[110px] items-center gap-1 sm:max-w-[150px]">
            <span
              className={`truncate font-extrabold text-foreground ${
                isFirst ? "text-sm sm:text-base" : "text-xs sm:text-sm"
              }`}
              title={entry.name}
            >
              {entry.name}
            </span>
          </div>

          {showSelfHighlight && entry.isSelf && (
            <span className="mt-0.5 rounded-full bg-primary/20 px-2 py-0.2 text-[10px] font-bold text-primary">
              Você
            </span>
          )}

          <span className="mt-0.5 max-w-[105px] truncate text-[11px] text-muted-foreground sm:max-w-[145px]">
            {entry.sectorSummary}
          </span>

          <div
            className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-extrabold ${
              isFirst
                ? "border-amber-400/40 bg-amber-400/15 text-xs text-amber-300 sm:text-sm"
                : "border-border bg-secondary/70 text-xs text-foreground"
            }`}
          >
            <span>{entry.points}</span>
            <span className="text-[10px] font-bold opacity-80">pts</span>
          </div>

          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-400/90">
            <Flame size={11} />
            {entry.streakDays}d seguidos
          </span>
        </div>
      ) : (
        <div className="mt-1 flex flex-col items-center">
          <span className="text-xs font-semibold text-muted-foreground">
            Vaga aberta
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground/70">0 pts</span>
        </div>
      )}
    </motion.div>
  );
}
