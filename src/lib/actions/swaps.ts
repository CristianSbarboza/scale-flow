"use server";

import { db } from "@/db";
import { servants, scheduleAssignments, swapRequests } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser } from "@/lib/scope";
import type { PendingSwapRequest } from "@/types/domain";

export async function createSwapRequest(dateId: number, targetServantId: number, requesterServantId: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [requester] = await db.select().from(servants).where(
    and(eq(servants.id, requesterServantId), eq(servants.userId, session.user.id))
  );
  if (!requester) throw new Error("Não autorizado");

  if (requesterServantId === targetServantId) {
    throw new Error("Não é possível negociar com você mesmo");
  }

  const [existing] = await db.select().from(swapRequests).where(
    and(
      eq(swapRequests.dateId, dateId),
      eq(swapRequests.targetServantId, targetServantId),
      eq(swapRequests.requesterServantId, requesterServantId),
      eq(swapRequests.status, "pending")
    )
  );
  if (existing) throw new Error("Você já enviou um pedido para esse dia");

  await db.insert(swapRequests).values({ dateId, requesterServantId, targetServantId });
  revalidatePath("/servant");
}

export async function getPendingSwapRequests(): Promise<PendingSwapRequest[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const myServants = await db.query.servants.findMany({ where: eq(servants.userId, session.user.id) });
  if (myServants.length === 0) return [];
  const myServantIds = myServants.map((s) => s.id);

  const rows = await db.query.swapRequests.findMany({
    where: and(inArray(swapRequests.targetServantId, myServantIds), eq(swapRequests.status, "pending")),
    with: {
      date: { with: { schedule: { with: { sector: true, ministry: true } } } },
      requester: { with: { user: publicUser } },
    },
    orderBy: (sr, { desc }) => desc(sr.createdAt),
  });

  return rows.map((r) => ({
    id: r.id,
    dateId: r.dateId,
    date: r.date.date,
    startTime: r.date.startTime,
    scheduleName: r.date.schedule.name,
    sectorName: r.date.schedule.sector.name,
    ministryName: r.date.schedule.ministry.name,
    requesterName: r.requester.user.name,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function respondToSwapRequest(id: number, accept: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const request = await db.query.swapRequests.findFirst({
    where: eq(swapRequests.id, id),
    with: { target: true },
  });
  if (!request) throw new Error("Pedido não encontrado");
  if (request.status !== "pending") throw new Error("Pedido já respondido");
  if (request.target.userId !== session.user.id) throw new Error("Não autorizado");

  if (accept) {
    await db.delete(scheduleAssignments).where(
      and(eq(scheduleAssignments.dateId, request.dateId), eq(scheduleAssignments.servantId, request.targetServantId))
    );
    const [existingAssignment] = await db.select().from(scheduleAssignments).where(
      and(eq(scheduleAssignments.dateId, request.dateId), eq(scheduleAssignments.servantId, request.requesterServantId))
    );
    if (!existingAssignment) {
      await db.insert(scheduleAssignments).values({ dateId: request.dateId, servantId: request.requesterServantId });
    }
    await db.update(swapRequests).set({ status: "accepted", respondedAt: new Date() }).where(eq(swapRequests.id, id));
    await db.update(swapRequests).set({ status: "rejected", respondedAt: new Date() }).where(
      and(
        eq(swapRequests.dateId, request.dateId),
        eq(swapRequests.targetServantId, request.targetServantId),
        eq(swapRequests.status, "pending")
      )
    );
  } else {
    await db.update(swapRequests).set({ status: "rejected", respondedAt: new Date() }).where(eq(swapRequests.id, id));
  }

  revalidatePath("/servant");
  revalidatePath("/admin/schedules");
}
