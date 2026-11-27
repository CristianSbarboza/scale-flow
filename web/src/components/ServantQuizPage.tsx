"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  Flame,
  HelpCircle,
  Trophy,
  X,
} from "lucide-react";
import {
  submitDailyQuizAnswer,
  type QuizDashboardData,
} from "@/lib/actions/quiz";
import QuizRankingBoard from "@/components/QuizRankingBoard";
import Button from "@/components/ui/Button";
import StatsRule, { type StatItem } from "@/components/ui/StatsRule";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

interface ServantQuizPageProps {
  initialData: QuizDashboardData;
}

export default function ServantQuizPage({ initialData }: ServantQuizPageProps) {
  const [data, setData] = useState<QuizDashboardData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(
    initialData.todayQuestion?.answeredOption ?? null,
  );
  const [subView, setSubView] = useState<"question" | "ranking">("question");
  const [isPending, startTransition] = useTransition();

  const handleConfirmAnswer = () => {
    if (selectedOption === null || !data.todayQuestion) return;
    setError(null);
    startTransition(async () => {
      try {
        const updated = await submitDailyQuizAnswer(selectedOption);
        setData(updated);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível enviar sua resposta.",
        );
      }
    });
  };

  const q = data.todayQuestion;
  const alreadyAnswered =
    q?.answeredOption !== null && q?.answeredOption !== undefined;

  const stats: StatItem[] = [
    {
      icon: Trophy,
      label: "pontos no mês",
      value: data.myPoints,
    },
    {
      icon: HelpCircle,
      label: "posição",
      value: data.myPosition ? `${data.myPosition}º` : "—",
    },
    {
      icon: Flame,
      label: data.myStreakDays === 1 ? "dia seguido" : "dias seguidos",
      value: data.myStreakDays,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Topo limpo: Régua de números + Alternador Pergunta | Ranking */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <StatsRule items={stats} className="mb-0 border-none pb-0" />

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setSubView("question")}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm"
            style={{
              background:
                subView === "question" ? "var(--primary)" : "transparent",
              color:
                subView === "question"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            <HelpCircle size={15} />
            <span>Pergunta</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView("ranking")}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm"
            style={{
              background:
                subView === "ranking" ? "var(--primary)" : "transparent",
              color:
                subView === "ranking"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            <Trophy size={15} />
            <span>Ranking</span>
          </button>
        </div>
      </div>

      {data.lostPointsBecauseMissedDay && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-foreground sm:text-sm">
          <AlertTriangle size={16} className="shrink-0 text-primary" />
          <span>
            Seus pontos zeraram porque você não entrou ontem. Responda hoje para recomeçar!
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {subView === "question" ? (
        q ? (
          <div className="card glass flex flex-col gap-5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Dia {data.dayOfMonth} de {data.totalDaysInMonth}
              </span>
              <span className="font-semibold text-primary">
                +{q.points} pts
              </span>
            </div>

            <h3 className="text-base leading-snug font-bold text-foreground sm:text-lg">
              {q.question}
            </h3>

            {/* 5 Alternativas */}
            <div className="flex flex-col gap-2">
              {q.options.map((optionText, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption =
                  alreadyAnswered && q.correctOption === idx;
                const isWrongSelected =
                  alreadyAnswered && q.answeredOption === idx && !q.isCorrect;

                let borderColor = "var(--border)";
                let bgColor = "var(--muted)";

                if (!alreadyAnswered && isSelected) {
                  borderColor = "var(--primary)";
                  bgColor = "color-mix(in oklab, var(--primary) 14%, var(--card))";
                } else if (isCorrectOption) {
                  borderColor = "var(--success)";
                  bgColor = "color-mix(in oklab, var(--success) 14%, var(--card))";
                } else if (isWrongSelected) {
                  borderColor = "var(--destructive)";
                  bgColor =
                    "color-mix(in oklab, var(--destructive) 14%, var(--card))";
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={alreadyAnswered || isPending}
                    onClick={() => setSelectedOption(idx)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
                    style={{
                      borderColor,
                      background: bgColor,
                      opacity:
                        alreadyAnswered && !isCorrectOption && !isWrongSelected
                          ? 0.65
                          : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: isCorrectOption
                            ? "var(--success)"
                            : isWrongSelected
                              ? "var(--destructive)"
                              : isSelected
                                ? "var(--primary)"
                                : "var(--card)",
                          color:
                            isCorrectOption || isWrongSelected || isSelected
                              ? "var(--primary-foreground)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {OPTION_LETTERS[idx]}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {optionText}
                      </span>
                    </div>

                    {isCorrectOption && (
                      <Check
                        size={18}
                        className="shrink-0"
                        style={{ color: "var(--success)" }}
                      />
                    )}
                    {isWrongSelected && (
                      <X
                        size={18}
                        className="shrink-0"
                        style={{ color: "var(--destructive)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {!alreadyAnswered ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-muted-foreground">
                  Ficar 1 dia sem entrar zera os pontos do mês.
                </span>
                <Button
                  variant="primary"
                  type="button"
                  disabled={selectedOption === null || isPending}
                  onClick={handleConfirmAnswer}
                >
                  {isPending ? "Enviando..." : "Responder"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/60 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p
                    className="text-sm font-bold"
                    style={{
                      color: q.isCorrect
                        ? "var(--success)"
                        : "var(--foreground)",
                    }}
                  >
                    {q.isCorrect
                      ? `Você acertou! +${q.pointsEarned ?? q.points} pontos`
                      : "Resposta incorreta · Presença do dia registrada"}
                  </p>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground">
                      {q.explanation}
                    </p>
                  )}
                </div>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setSubView("ranking")}
                  className="shrink-0"
                >
                  <Trophy size={15} />
                  Ver Ranking
                </Button>
              </div>
            )}
          </div>
        ) : null
      ) : (
        <QuizRankingBoard data={data} showSelfHighlight hideStatsRule />
      )}
    </div>
  );
}
