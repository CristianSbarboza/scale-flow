import type { Metadata } from "next";
import { db } from "@/db";
import { churches, ministries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PublicChurchScheduleView, {
  type PublicChurchDateEntry,
  type PublicChurchMinistryOption,
  type PublicChurchSectorOption,
} from "./PublicChurchScheduleView";

interface PageProps {
  params: Promise<{ igreja: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { igreja } = await params;
  const slug = decodeURIComponent(igreja).trim().toLowerCase();

  const church = await db.query.churches.findFirst({
    where: eq(churches.username, slug),
    columns: { name: true },
  });

  if (!church) {
    return { title: "Escalas — ScaleFlow" };
  }

  return {
    title: `Escalas do Mês — ${church.name}`,
    description: `Calendário e lista pública de escalas de todos os ministérios e setores de ${church.name}.`,
  };
}

export default async function PublicChurchSchedulesPage({ params }: PageProps) {
  const { igreja } = await params;
  const slug = decodeURIComponent(igreja).trim().toLowerCase();

  const church = await db.query.churches.findFirst({
    where: eq(churches.username, slug),
    columns: { id: true, name: true },
  });

  if (!church) {
    notFound();
  }

  const churchMinistries = await db.query.ministries.findMany({
    where: and(eq(ministries.churchId, church.id), eq(ministries.isActive, true)),
    columns: { id: true, name: true },
    with: {
      sectors: {
        where: (s, { eq: eqOp }) => eqOp(s.isActive, true),
        columns: { id: true, name: true, ministryId: true },
        with: {
          schedules: {
            columns: { id: true, name: true },
            with: {
              dates: {
                with: {
                  assignments: {
                    with: {
                      servant: {
                        columns: { id: true, isActive: true },
                        with: {
                          user: {
                            columns: { name: true, color: true, isActive: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const ministryOptions: PublicChurchMinistryOption[] = churchMinistries
    .map((m) => ({ id: m.id, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const sectorOptions: PublicChurchSectorOption[] = [];
  const entries: PublicChurchDateEntry[] = [];

  for (const ministry of churchMinistries) {
    for (const sector of ministry.sectors) {
      sectorOptions.push({
        id: sector.id,
        name: sector.name,
        ministryId: ministry.id,
      });

      for (const schedule of sector.schedules) {
        for (const d of schedule.dates) {
          entries.push({
            dateId: d.id,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            ministryId: ministry.id,
            ministryName: ministry.name,
            sectorId: sector.id,
            sectorName: sector.name,
            date: d.date,
            startTime: d.startTime,
            title: d.title,
            assignees: d.assignments
              .filter((a) => a.servant.isActive && a.servant.user.isActive)
              .map((a) => ({
                servantId: a.servantId,
                name: a.servant.user.name,
                color: a.servant.user.color,
              }))
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
          });
        }
      }
    }
  }

  sectorOptions.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  entries.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = a.startTime.localeCompare(b.startTime);
    if (timeCompare !== 0) return timeCompare;
    const minCompare = a.ministryName.localeCompare(b.ministryName, "pt-BR");
    if (minCompare !== 0) return minCompare;
    return a.sectorName.localeCompare(b.sectorName, "pt-BR");
  });

  return (
    <PublicChurchScheduleView
      data={{
        churchName: church.name,
        ministries: ministryOptions,
        sectors: sectorOptions,
        entries,
      }}
    />
  );
}

