"use client";

import { Crown, Flame, Trophy, Calendar, Users } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Panel from "@/components/ui/Panel";
import ListRow from "@/components/ui/ListRow";
import StatsRule, { type StatItem } from "@/components/ui/StatsRule";
import EmptyState from "@/components/ui/EmptyState";
import type { QuizDashboardData, QuizRankingEntry } from "@/lib/actions/quiz";

interface QuizRankingBoardProps {
  data: QuizDashboardData;
  showSelfHighlight?: boolean;
  hideStatsRule?: boolean;
}

export default function QuizRankingBoard({
  data,
  showSelfHighlight = true,
  hideStatsRule = false,
}: QuizRankingBoardProps) {
  const first = data.ranking[0] ?? null;
  const second = data.ranking[1] ?? null;
  const third = data.ranking[2] ?? null;

  const stats: StatItem[] = [
    {
      icon: Calendar,
      label: `Temporada (${data.monthLabel})`,
      value: `01 a ${data.totalDaysInMonth}`,
    },
    {
      icon: Trophy,
      label: data.daysRemaining === 1 ? "dia restante" : "dias restantes",
      value: data.daysRemaining,
    },
    {
      icon: Users,
      label: data.ranking.length === 1 ? "servo participando" : "servos",
      value: data.ranking.length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!hideStatsRule && <StatsRule items={stats} className="mb-0" />}

      {/* Palco em Círculo dos 3 Primeiros */}
      <div className="card glass relative overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
        {/* Círculos concêntricos do palco */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15"
          style={{
            width: "320px",
            height: "320px",
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 16%, transparent) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
          style={{ width: "220px", height: "220px" }}
        />

        <div className="relative z-10 mx-auto grid max-w-lg grid-cols-3 items-end gap-3 sm:gap-6">
          <PodiumCircleSpot
            place={2}
            entry={second}
            showSelfHighlight={showSelfHighlight}
          />
          <PodiumCircleSpot
            place={1}
            entry={first}
            showSelfHighlight={showSelfHighlight}
          />
          <PodiumCircleSpot
            place={3}
            entry={third}
            showSelfHighlight={showSelfHighlight}
          />
        </div>
      </div>

      {/* Classificação Geral usando o Panel + ListRow nativos do app */}
      <Panel
        title="Classificação"
        action={
          <span className="text-xs text-muted-foreground">
            {data.monthLabel}
          </span>
        }
      >
        {data.ranking.length === 0 ? (
          <EmptyState>Nenhum servo ativo no momento.</EmptyState>
        ) : (
          <div className="flex flex-col">
            {data.ranking.map((entry) => {
              const isSelf = showSelfHighlight && entry.isSelf;
              return (
                <ListRow
                  key={entry.userId}
                  className={
                    isSelf
                      ? "-mx-3 rounded-lg bg-primary/10 px-3"
                      : undefined
                  }
                  leading={
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 text-center text-xs font-bold"
                        style={{
                          color:
                            entry.position <= 3
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {entry.position}º
                      </span>
                      <Avatar
                        name={entry.name}
                        color={entry.color}
                        icon={entry.avatarIcon}
                        size="sm"
                      />
                    </div>
                  }
                  title={
                    <span className="inline-flex items-center gap-2">
                      <span>{entry.name}</span>
                      {isSelf && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Você
                        </span>
                      )}
                    </span>
                  }
                  subtitle={entry.sectorSummary}
                  trailing={
                    <div className="flex items-center gap-3">
                      {entry.streakDays > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                          title={`${entry.streakDays} dias seguidos`}
                        >
                          <Flame size={13} />
                          {entry.streakDays}d
                        </span>
                      )}
                      <span className="text-sm font-bold text-foreground">
                        {entry.points}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          pts
                        </span>
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </Panel>
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

  return (
    <div
      className={`flex flex-col items-center text-center ${
        isFirst ? "-translate-y-3 sm:-translate-y-4" : ""
      }`}
    >
      <div className="mb-1.5 flex h-6 items-center justify-center">
        {isFirst && <Crown size={20} className="text-primary" />}
      </div>

      {/* Círculo no palco */}
      <div className="relative mb-3 flex items-center justify-center">
        <div
          className={`relative flex items-center justify-center rounded-full bg-card p-1.5 ${
            isFirst ? "size-24 sm:size-28" : "size-18 sm:size-21"
          }`}
          style={{
            border: isFirst
              ? "2px solid var(--primary)"
              : "1.5px solid var(--border)",
            boxShadow: isFirst
              ? "0 0 0 4px color-mix(in oklab, var(--primary) 20%, transparent), 0 12px 28px rgba(0,0,0,0.28)"
              : "0 6px 16px rgba(0,0,0,0.18)",
          }}
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
                  : "size-14! text-base! sm:size-17!"
              }
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              —
            </div>
          )}

          <span
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm"
            style={{
              background: isFirst ? "var(--primary)" : "var(--muted)",
              color: isFirst
                ? "var(--primary-foreground)"
                : "var(--foreground)",
              border: isFirst ? "none" : "1px solid var(--border)",
            }}
          >
            {place}º
          </span>
        </div>
      </div>

      {entry ? (
        <div className="mt-1 flex max-w-full flex-col items-center">
          <span
            className={`max-w-[105px] truncate font-bold text-foreground sm:max-w-[145px] ${
              isFirst ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
            title={entry.name}
          >
            {entry.name}
            {showSelfHighlight && entry.isSelf ? " (você)" : ""}
          </span>

          <span className="max-w-[100px] truncate text-[11px] text-muted-foreground sm:max-w-[140px]">
            {entry.sectorSummary}
          </span>

          <span
            className={`mt-1.5 font-bold ${
              isFirst ? "text-sm text-primary" : "text-xs text-foreground"
            }`}
          >
            {entry.points} pts
          </span>
        </div>
      ) : (
        <span className="mt-1 text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
