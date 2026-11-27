"use server";

import { db } from "@/db";
import {
  users,
  servants,
  sectors,
  ministries,
  quizQuestions,
  quizRankings,
  quizDailyAnswers,
} from "@/db/schema";
import { and, eq, lt, gt } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";

export interface QuizQuestionView {
  id: number;
  dayOfMonth: number;
  question: string;
  options: [string, string, string, string, string];
  points: number;
  /** Só preenchidos depois que o servo já respondeu a pergunta de hoje. */
  answeredOption: number | null;
  isCorrect: boolean | null;
  correctOption: number | null;
  explanation: string | null;
  pointsEarned: number | null;
}

export interface QuizRankingEntry {
  position: number;
  userId: string;
  name: string;
  color: string | null;
  avatarIcon: string | null;
  sectorSummary: string;
  points: number;
  streakDays: number;
  correctCount: number;
  answeredCount: number;
  playedToday: boolean;
  isSelf: boolean;
}

export interface QuizDashboardData {
  todayIso: string;
  monthKey: string;
  monthLabel: string;
  dayOfMonth: number;
  totalDaysInMonth: number;
  daysRemaining: number;
  myPoints: number;
  myPosition: number | null;
  myStreakDays: number;
  myCorrectCount: number;
  lostPointsBecauseMissedDay: boolean;
  todayQuestion: QuizQuestionView | null;
  ranking: QuizRankingEntry[];
}

function getSaoPauloClock() {
  const nowSp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const year = nowSp.getFullYear();
  const monthIndex = nowSp.getMonth(); // 0..11
  const day = nowSp.getDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const monthKey = `${year}-${pad(monthIndex + 1)}`;
  const todayIso = `${monthKey}-${pad(day)}`;

  const yesterday = new Date(year, monthIndex, day - 1);
  const yesterdayIso = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysRemaining = Math.max(0, totalDaysInMonth - day);

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return {
    todayIso,
    yesterdayIso,
    monthKey,
    dayOfMonth: day,
    totalDaysInMonth,
    daysRemaining,
    monthLabel,
  };
}

/**
 * Regra do jogo: "se a pessoa não entrar todo dia perde os pontos".
 * Qualquer servo que tinha pontos acumulados neste mês mas cuja última
 * presença (`last_active_date`) foi anterior a ontem (`< yesterdayIso`)
 * perde os pontos acumulados neste mês.
 */
async function reconcileChurchPenalties(
  churchId: number,
  monthKey: string,
  yesterdayIso: string,
  currentUserId?: string,
): Promise<boolean> {
  // Verifica se o próprio usuário logado perdeu pontos por ter faltado ontem
  let currentUserLostPoints = false;
  if (currentUserId) {
    const [myRow] = await db
      .select({
        points: quizRankings.points,
        lastActiveDate: quizRankings.lastActiveDate,
      })
      .from(quizRankings)
      .where(
        and(
          eq(quizRankings.userId, currentUserId),
          eq(quizRankings.monthKey, monthKey),
        ),
      );
    if (
      myRow &&
      myRow.points > 0 &&
      myRow.lastActiveDate !== null &&
      myRow.lastActiveDate.slice(0, 10) < yesterdayIso
    ) {
      currentUserLostPoints = true;
    }
  }

  await db
    .update(quizRankings)
    .set({
      points: 0,
      streakDays: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizRankings.churchId, churchId),
        eq(quizRankings.monthKey, monthKey),
        gt(quizRankings.points, 0),
        lt(quizRankings.lastActiveDate, yesterdayIso),
      ),
    );

  return currentUserLostPoints;
}

/**
 * Monta o ranking completo entre todos os servos ativos da igreja no mês atual.
 */
async function buildChurchServantRanking(
  churchId: number,
  monthKey: string,
  todayIso: string,
  selfUserId: string,
): Promise<QuizRankingEntry[]> {
  const [servantRows, rankingRows] = await Promise.all([
    db
      .select({
        userId: users.id,
        userName: users.name,
        userColor: users.color,
        userAvatarIcon: users.avatarIcon,
        sectorName: sectors.name,
      })
      .from(servants)
      .innerJoin(users, eq(servants.userId, users.id))
      .innerJoin(sectors, eq(servants.sectorId, sectors.id))
      .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
      .where(
        and(
          eq(ministries.churchId, churchId),
          eq(ministries.isActive, true),
          eq(sectors.isActive, true),
          eq(servants.isActive, true),
          eq(users.isActive, true),
        ),
      ),
    db
      .select()
      .from(quizRankings)
      .where(
        and(
          eq(quizRankings.churchId, churchId),
          eq(quizRankings.monthKey, monthKey),
        ),
      ),
  ]);

  // Agrupa os setores por usuário (um servo pode servir em mais de um setor)
  const servantsByUser = new Map<
    string,
    {
      userId: string;
      name: string;
      color: string | null;
      avatarIcon: string | null;
      sectors: Set<string>;
    }
  >();

  for (const row of servantRows) {
    const existing = servantsByUser.get(row.userId);
    if (existing) {
      existing.sectors.add(row.sectorName);
    } else {
      servantsByUser.set(row.userId, {
        userId: row.userId,
        name: row.userName,
        color: row.userColor,
        avatarIcon: row.userAvatarIcon,
        sectors: new Set([row.sectorName]),
      });
    }
  }

  const scoreByUser = new Map(rankingRows.map((r) => [r.userId, r]));

  const entries: Omit<QuizRankingEntry, "position">[] = [];
  for (const sv of servantsByUser.values()) {
    const score = scoreByUser.get(sv.userId);
    entries.push({
      userId: sv.userId,
      name: sv.name,
      color: sv.color,
      avatarIcon: sv.avatarIcon,
      sectorSummary: Array.from(sv.sectors).join(", "),
      points: score?.points ?? 0,
      streakDays: score?.streakDays ?? 0,
      correctCount: score?.correctCount ?? 0,
      answeredCount: score?.answeredCount ?? 0,
      playedToday: score?.lastActiveDate?.slice(0, 10) === todayIso,
      isSelf: sv.userId === selfUserId,
    });
  }

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (b.streakDays !== a.streakDays) return b.streakDays - a.streakDays;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return entries.map((e, idx) => ({
    ...e,
    position: idx + 1,
  }));
}

export async function getQuizDashboard(): Promise<QuizDashboardData> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const clock = getSaoPauloClock();
  const churchId = session.user.churchId;
  const userId = session.user.id;

  const lostPoints = await reconcileChurchPenalties(
    churchId,
    clock.monthKey,
    clock.yesterdayIso,
    userId,
  );

  // Registra presença diária do servo ao entrar na página do mini game
  // (se ele já tinha presença ontem, mantém os pontos vivos hoje)
  if (session.user.role === "servant") {
    const [existingRank] = await db
      .select()
      .from(quizRankings)
      .where(
        and(
          eq(quizRankings.userId, userId),
          eq(quizRankings.monthKey, clock.monthKey),
        ),
      );

    if (!existingRank) {
      await db
        .insert(quizRankings)
        .values({
          userId,
          churchId,
          monthKey: clock.monthKey,
          points: 0,
          streakDays: 1,
          correctCount: 0,
          answeredCount: 0,
          lastActiveDate: clock.todayIso,
        })
        .onConflictDoNothing();
    } else if (existingRank.lastActiveDate?.slice(0, 10) !== clock.todayIso) {
      const wasActiveYesterday =
        existingRank.lastActiveDate?.slice(0, 10) === clock.yesterdayIso;
      await db
        .update(quizRankings)
        .set({
          lastActiveDate: clock.todayIso,
          streakDays: wasActiveYesterday ? existingRank.streakDays + 1 : 1,
          updatedAt: new Date(),
        })
        .where(eq(quizRankings.id, existingRank.id));
    }
  }

  const [[questionRow], [todayAnswer], ranking] = await Promise.all([
    db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.dayOfMonth, clock.dayOfMonth)),
    db
      .select()
      .from(quizDailyAnswers)
      .where(
        and(
          eq(quizDailyAnswers.userId, userId),
          eq(quizDailyAnswers.answerDate, clock.todayIso),
        ),
      ),
    buildChurchServantRanking(churchId, clock.monthKey, clock.todayIso, userId),
  ]);

  const meInRanking = ranking.find((r) => r.userId === userId);

  let todayQuestion: QuizQuestionView | null = null;
  if (questionRow) {
    const alreadyAnswered = Boolean(todayAnswer);
    todayQuestion = {
      id: questionRow.id,
      dayOfMonth: questionRow.dayOfMonth ?? clock.dayOfMonth,
      question: questionRow.question,
      options: [
        questionRow.optionA,
        questionRow.optionB,
        questionRow.optionC,
        questionRow.optionD,
        questionRow.optionE,
      ],
      points: questionRow.points,
      answeredOption: alreadyAnswered ? todayAnswer.selectedOption : null,
      isCorrect: alreadyAnswered ? todayAnswer.isCorrect : null,
      // Só envia o gabarito depois que o servo respondeu
      correctOption: alreadyAnswered ? questionRow.correctOption : null,
      explanation: alreadyAnswered ? questionRow.explanation : null,
      pointsEarned: alreadyAnswered ? todayAnswer.pointsEarned : null,
    };
  }

  return {
    todayIso: clock.todayIso,
    monthKey: clock.monthKey,
    monthLabel: clock.monthLabel,
    dayOfMonth: clock.dayOfMonth,
    totalDaysInMonth: clock.totalDaysInMonth,
    daysRemaining: clock.daysRemaining,
    myPoints: meInRanking?.points ?? 0,
    myPosition: meInRanking?.position ?? null,
    myStreakDays: meInRanking?.streakDays ?? 0,
    myCorrectCount: meInRanking?.correctCount ?? 0,
    lostPointsBecauseMissedDay: lostPoints,
    todayQuestion,
    ranking,
  };
}

export async function submitDailyQuizAnswer(
  selectedOption: number,
): Promise<QuizDashboardData> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  if (
    !Number.isInteger(selectedOption) ||
    selectedOption < 0 ||
    selectedOption > 4
  ) {
    throw new Error("Opção inválida.");
  }

  const clock = getSaoPauloClock();
  const userId = session.user.id;
  const churchId = session.user.churchId;

  await reconcileChurchPenalties(
    churchId,
    clock.monthKey,
    clock.yesterdayIso,
    userId,
  );

  const [existingAnswer] = await db
    .select()
    .from(quizDailyAnswers)
    .where(
      and(
        eq(quizDailyAnswers.userId, userId),
        eq(quizDailyAnswers.answerDate, clock.todayIso),
      ),
    );

  if (existingAnswer) {
    return await getQuizDashboard();
  }

  const [question] = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.dayOfMonth, clock.dayOfMonth));

  if (!question) {
    throw new Error("Pergunta do dia não encontrada.");
  }

  const isCorrect = selectedOption === question.correctOption;
  const pointsEarned = isCorrect ? question.points : 0;

  await db.insert(quizDailyAnswers).values({
    userId,
    questionId: question.id,
    answerDate: clock.todayIso,
    monthKey: clock.monthKey,
    selectedOption,
    isCorrect,
    pointsEarned,
  });

  const [existingRank] = await db
    .select()
    .from(quizRankings)
    .where(
      and(
        eq(quizRankings.userId, userId),
        eq(quizRankings.monthKey, clock.monthKey),
      ),
    );

  if (!existingRank) {
    await db.insert(quizRankings).values({
      userId,
      churchId,
      monthKey: clock.monthKey,
      points: pointsEarned,
      streakDays: 1,
      correctCount: isCorrect ? 1 : 0,
      answeredCount: 1,
      lastActiveDate: clock.todayIso,
    });
  } else {
    const alreadyCountedToday =
      existingRank.lastActiveDate?.slice(0, 10) === clock.todayIso;
    const wasActiveYesterday =
      existingRank.lastActiveDate?.slice(0, 10) === clock.yesterdayIso;
    const nextStreak = alreadyCountedToday
      ? Math.max(1, existingRank.streakDays)
      : wasActiveYesterday
        ? existingRank.streakDays + 1
        : 1;

    await db
      .update(quizRankings)
      .set({
        points: existingRank.points + pointsEarned,
        streakDays: nextStreak,
        correctCount: existingRank.correctCount + (isCorrect ? 1 : 0),
        answeredCount: existingRank.answeredCount + 1,
        lastActiveDate: clock.todayIso,
        updatedAt: new Date(),
      })
      .where(eq(quizRankings.id, existingRank.id));
  }

  revalidatePath("/servant");
  revalidatePath("/admin/ranking");
  return await getQuizDashboard();
}
