"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  HelpCircle,
  Loader2,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  getQuizDashboard,
  submitDailyQuizAnswer,
  type QuizDashboardData,
} from "@/lib/actions/quiz";
import QuizRankingBoard from "@/components/QuizRankingBoard";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

export default function ServantQuizPage() {
  const [data, setData] = useState<QuizDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [subView, setSubView] = useState<"question" | "ranking">("question");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getQuizDashboard()
      .then((res) => {
        if (!active) return;
        setData(res);
        if (res.todayQuestion?.answeredOption !== null && res.todayQuestion?.answeredOption !== undefined) {
          setSelectedOption(res.todayQuestion.answeredOption);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar o desafio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleConfirmAnswer = () => {
    if (selectedOption === null || !data?.todayQuestion) return;
    startTransition(async () => {
      try {
        const updated = await submitDailyQuizAnswer(selectedOption);
        setData(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar sua resposta.");
      }
    });
  };

  if (loading) {
    return (
      <div className="card glass flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Carregando a pergunta do dia e o ranking dos servos...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card glass flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={28} className="text-destructive" />
        <p className="text-sm font-semibold text-foreground">
          {error ?? "Não foi possível abrir o desafio agora."}
        </p>
      </div>
    );
  }

  const q = data.todayQuestion;
  const alreadyAnswered = q?.answeredOption !== null && q?.answeredOption !== undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Resumo Pessoal + Navegação Interna (Pergunta do Dia | Ranking) */}
      <div className="card glass flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
            <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Seus Pontos
              </div>
              <div className="text-base font-extrabold text-primary sm:text-lg">
                {data.myPoints} <span className="text-xs font-bold">pts</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Sua Posição
              </div>
              <div className="text-base font-extrabold text-foreground sm:text-lg">
                {data.myPosition ? `${data.myPosition}º lugar` : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Sequência
              </div>
              <div className="inline-flex items-center gap-1 text-base font-extrabold text-amber-400 sm:text-lg">
                <Flame size={16} />
                <span>{data.myStreakDays}d</span>
              </div>
            </div>
          </div>

          {/* Seletor Pergunta de Hoje vs Página de Ranking (dentro do Mini Game) */}
          <div className="grid grid-cols-2 rounded-xl border border-border bg-secondary/70 p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setSubView("question")}
              className={`relative flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                subView === "question"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle size={15} />
              <span>Pergunta do Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView("ranking")}
              className={`relative flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                subView === "ranking"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy size={15} />
              <span>Ranking do Mês</span>
            </button>
          </div>
        </div>

        {/* Alerta caso tenha perdido os pontos por faltar 1 dia */}
        {data.lostPointsBecauseMissedDay && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200 sm:text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <strong className="font-bold">Seus pontos reiniciaram!</strong> Como você ficou sem entrar no desafio ontem, seus pontos acumulados neste mês voltaram a zero. Continue entrando todos os dias para subir novamente no ranking!
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {subView === "question" ? (
          <motion.div
            key="quiz-question-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {q ? (
              <div className="card glass relative overflow-hidden p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <Sparkles size={13} />
                    Pergunta #{q.dayOfMonth} · Dia {data.dayOfMonth} de {data.totalDaysInMonth}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">
                    Vale +{q.points} pontos
                  </span>
                </div>

                <h3 className="mb-5 text-base leading-relaxed font-extrabold text-foreground sm:text-xl">
                  {q.question}
                </h3>

                {/* 5 Opções (A, B, C, D, E) */}
                <div className="flex flex-col gap-2.5">
                  {q.options.map((optionText, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrectOption = alreadyAnswered && q.correctOption === idx;
                    const isWrongSelected =
                      alreadyAnswered && q.answeredOption === idx && !q.isCorrect;

                    let optionStyle =
                      "border-border bg-secondary/50 text-foreground hover:border-primary/50 hover:bg-secondary";
                    if (!alreadyAnswered && isSelected) {
                      optionStyle =
                        "border-primary bg-primary/15 text-foreground ring-2 ring-primary/40";
                    } else if (isCorrectOption) {
                      optionStyle =
                        "border-emerald-500/60 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/40";
                    } else if (isWrongSelected) {
                      optionStyle =
                        "border-destructive/60 bg-destructive/15 text-red-200 ring-1 ring-destructive/40";
                    } else if (alreadyAnswered) {
                      optionStyle = "border-border/50 bg-secondary/30 text-muted-foreground opacity-75";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={alreadyAnswered || isPending}
                        onClick={() => setSelectedOption(idx)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                              isCorrectOption
                                ? "bg-emerald-500 text-slate-950"
                                : isWrongSelected
                                  ? "bg-destructive text-white"
                                  : isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-muted-foreground"
                            }`}
                          >
                            {OPTION_LETTERS[idx]}
                          </span>
                          <span className="text-sm font-semibold sm:text-base">
                            {optionText}
                          </span>
                        </div>

                        {isCorrectOption && (
                          <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                        )}
                        {isWrongSelected && (
                          <XCircle size={20} className="shrink-0 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Botão Confirmar ou Resultado da Pergunta de Hoje */}
                {!alreadyAnswered ? (
                  <div className="mt-5 flex flex-col items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">
                      Entre todos os dias para não perder seus pontos acumulados no mês.
                    </p>
                    <button
                      type="button"
                      disabled={selectedOption === null || isPending}
                      onClick={handleConfirmAnswer}
                      className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <span>Confirmar Resposta</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-5 rounded-xl border p-4 ${
                      q.isCorrect
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-2.5">
                        {q.isCorrect ? (
                          <CheckCircle2
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-400"
                          />
                        ) : (
                          <XCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-foreground">
                            {q.isCorrect
                              ? `Parabéns! Você acertou e ganhou +${q.pointsEarned ?? q.points} pontos!`
                              : "Não foi dessa vez! Mas sua presença de hoje está garantida."}
                          </h4>
                          {q.explanation && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSubView("ranking")}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform active:scale-95"
                      >
                        <Trophy size={14} />
                        <span>Ver Palco do Ranking</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="quiz-ranking-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <QuizRankingBoard data={data} showSelfHighlight />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
