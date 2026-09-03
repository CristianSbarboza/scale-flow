"use server";

import { db } from "@/db";
import { servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, requireScheduleSectorAccess, getSectorIdForDateId, getSectorIdForAssignmentId } from "@/lib/scope";
import type { ServantOverviewSchedule } from "@/types/domain";

// Returns every schedule for the logged-in servant's sector, with each date
// flagged for whether THIS servant is confirmed/has sent availability on it,
// plus the full list of confirmed assignees (for the day-swap feature).
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
  });
  if (memberships.length === 0) return [];

  const results: ServantOverviewSchedule[] = [];
  for (const servant of memberships) {
    // Rascunho não aparece: é escala ainda sendo montada, e o servo que
    // preenchesse disponibilidade nela responderia a algo que pode mudar.
    const sectorSchedules = await db.query.schedules.findMany({
      where: and(eq(schedules.sectorId, servant.sectorId), eq(schedules.status, "published")),
      with: {
        ministry: true,
        sector: true,
        dates: {
          with: {
            assignments: { with: { servant: { with: { user: publicUser } } } },
            availabilities: { where: eq(scheduleAvailability.servantId, servant.id) },
          },
        },
      },
    });

    for (const s of sectorSchedules) {
      results.push({
        id: s.id,
        name: s.name,
        ministryName: s.ministry.name,
        sectorName: s.sector.name,
        shareLink: s.shareLink,
        servantId: servant.id,
        dates: s.dates.map((d) => ({
          id: d.id,
          date: d.date,
          startTime: d.startTime,
          confirmed: d.assignments.some((a) => a.servantId === servant.id),
          available: d.availabilities.length > 0,
          assignees: d.assignments.map((a) => ({
            servantId: a.servantId,
            userId: a.servant.userId,
            name: a.servant.user.name,
            isSelf: a.servantId === servant.id,
            color: a.servant.user.color,
          })),
        })),
      });
    }
  }
  return results;
}

export async function assignServant(dateId: number, servantId: number) {
  const sectorId = await getSectorIdForDateId(dateId);
  await requireScheduleSectorAccess(sectorId);

  // O acesso acima cobre a data; `servantId` chegava sem nenhuma checagem.
  // Exigir que o servo sirva no setor da escala é a mesma regra que
  // `saveAvailability` já aplica — e, de quebra, garante a mesma igreja.
  const [servant] = await db.select().from(servants).where(
    and(eq(servants.id, servantId), eq(servants.sectorId, sectorId))
  );
  if (!servant) throw new Error("Este servo não pertence ao setor desta escala");

  // Escalar duas vezes a mesma pessoa no mesmo dia não é erro do líder, é
  // clique repetido — e não há unique em (date_id, servant_id) para barrar.
  // Sem isto, a pessoa aparecia duplicada em "Confirmados" e o "Remover" só
  // tirava uma das linhas.
  const [existing] = await db.select().from(scheduleAssignments).where(
    and(eq(scheduleAssignments.dateId, dateId), eq(scheduleAssignments.servantId, servantId))
  );
  if (existing) return;

  await db.insert(scheduleAssignments).values({
    dateId,
    servantId,
  });
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function removeAssignment(assignmentId: number) {
  await requireScheduleSectorAccess(await getSectorIdForAssignmentId(assignmentId));

  await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, assignmentId));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

/**
 * Grava a disponibilidade do servo numa escala.
 *
 * Quem responde por si mesmo, logado, **substitui** o que tinha enviado: a
 * tela vem marcada com as datas já informadas, então desmarcar uma precisa
 * apagá-la, senão o servo desmarca, salva, e a data continua lá. Foi por isso
 * que o painel bloqueava reabrir uma escala já preenchida — o bloqueio
 * escondia o fato de que não dava para corrigir nada.
 *
 * Quem responde pelo link público **sem sessão** continua só somando datas.
 * Ali qualquer visitante escolhe qualquer nome da lista, e a tela não tem como
 * vir marcada sem mostrar a resposta alheia — apagar seria dar a um estranho o
 * poder de limpar o que o servo já tinha enviado.
 *
 * `scheduleId` chega do cliente e é validado como todo o resto: é dele que sai
 * o conjunto de datas da escala, e usar a lista que o formulário mandou seria
 * deixar o cliente escolher o que pode ser apagado.
 */
export async function saveAvailability(servantId: number, scheduleId: number, dateIds: number[]) {
  const uniqueDateIds = [...new Set(dateIds)];

  const [servant] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!servant) throw new Error("Servo não encontrado");

  const [schedule] = await db.select({
    id: schedules.id,
    sectorId: schedules.sectorId,
    visibility: schedules.visibility,
    status: schedules.status,
  }).from(schedules).where(eq(schedules.id, scheduleId));
  if (!schedule) throw new Error("Escala não encontrada");

  if (schedule.sectorId !== servant.sectorId) {
    throw new Error("Este servo não pertence ao setor desta escala");
  }
  // A tela já esconde rascunho, mas esta action é um endpoint POST: quem
  // guardou o link de quando a escala estava aberta não pode gravar nela
  // depois de ela voltar para rascunho.
  if (schedule.status !== "published") {
    throw new Error("Esta escala ainda não está aberta para respostas");
  }

  // Todas as datas precisam ser desta escala — impede gravar cruzando
  // setores/escalas adivinhando IDs.
  const datasDaEscala = await db.select({ id: scheduleDates.id })
    .from(scheduleDates).where(eq(scheduleDates.scheduleId, scheduleId));
  const idsDaEscala = new Set(datasDaEscala.map((d) => d.id));
  if (uniqueDateIds.some((id) => !idsDaEscala.has(id))) throw new Error("Data inválida");

  // Escala privada: exige login e que o servo informado seja o próprio usuário.
  // Escala pública: sem login segue aberta (por design), mas se houver sessão
  // ainda assim impede responder no lugar de outra pessoa.
  const session = await getServerSession(authOptions);
  if (schedule.visibility === "private" && !session) {
    throw new Error("Faça login para responder a esta escala");
  }
  if (session && servant.userId !== session.user.id) {
    throw new Error("Não autorizado a responder por outro servo");
  }

  // A mesma condição que a página usa para vir com as datas marcadas. Se as
  // duas saírem de sincronia, ou o servo edita uma tela em branco (e perde o
  // que tinha), ou desmarca e nada acontece.
  const substituindo = Boolean(session) && servant.userId === session?.user.id;

  const jaMarcadas = idsDaEscala.size === 0 ? [] : await db.select({ dateId: scheduleAvailability.dateId })
    .from(scheduleAvailability)
    .where(and(
      eq(scheduleAvailability.servantId, servantId),
      inArray(scheduleAvailability.dateId, [...idsDaEscala]),
    ));

  if (substituindo) {
    const remover = jaMarcadas.map((r) => r.dateId).filter((id) => !uniqueDateIds.includes(id));
    if (remover.length > 0) {
      await db.delete(scheduleAvailability).where(and(
        eq(scheduleAvailability.servantId, servantId),
        inArray(scheduleAvailability.dateId, remover),
      ));
    }
  }

  const existentes = new Set(jaMarcadas.map((r) => r.dateId));
  const inserir = uniqueDateIds.filter((id) => !existentes.has(id));
  if (inserir.length > 0) {
    await db.insert(scheduleAvailability).values(
      inserir.map((dateId) => ({ servantId, dateId })),
    );
  }

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}
