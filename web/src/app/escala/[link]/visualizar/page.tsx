import type { Metadata } from "next";
import { db } from "@/db";
import { schedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import PublicScheduleView from "./PublicScheduleView";

function BlockedNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-[600px] px-6">
        <div
          className="card glass animate-fade-in"
          style={{ textAlign: "center", padding: "3rem 2rem" }}
        >
          <Lock
            size={32}
            color="var(--primary)"
            style={{ margin: "0 auto 1.25rem" }}
          />
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            {title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9375rem" }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ link: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { link } = await params;
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.shareLink, link),
    columns: { name: true },
    with: {
      ministry: {
        columns: { name: true },
        with: { church: { columns: { name: true } } },
      },
      sector: { columns: { name: true } },
    },
  });

  if (!schedule) {
    return { title: "Escala — ScaleFlow" };
  }

  return {
    title: `${schedule.name} · ${schedule.sector.name} — ${schedule.ministry.church.name}`,
    description: `Visualização pública da escala ${schedule.name} (${schedule.ministry.name} · ${schedule.sector.name}).`,
  };
}

export default async function PublicScheduleVisualizePage({ params }: PageProps) {
  const { link } = await params;

  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.shareLink, link),
    with: {
      ministry: { with: { church: { columns: { name: true } } } },
      sector: true,
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
  });

  if (!schedule) {
    notFound();
  }

  if (!schedule.ministry.isActive) {
    return (
      <BlockedNotice
        title="Ministério desativado"
        message={`O ministério ${schedule.ministry.name} está desativado no momento.`}
      />
    );
  }

  if (!schedule.sector.isActive) {
    return (
      <BlockedNotice
        title="Setor desativado"
        message={`O setor ${schedule.sector.name} está desativado no momento.`}
      />
    );
  }

  const sortedDates = [...schedule.dates]
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    })
    .map((d) => ({
      id: d.id,
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
    }));

  return (
    <PublicScheduleView
      schedule={{
        id: schedule.id,
        name: schedule.name,
        churchName: schedule.ministry.church.name,
        ministryName: schedule.ministry.name,
        sectorName: schedule.sector.name,
        dates: sortedDates,
      }}
    />
  );
}

