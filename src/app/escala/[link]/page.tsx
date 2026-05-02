import { db } from "@/db";
import { schedules, servants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AvailabilityForm from "./AvailabilityForm";

export default async function PublicSchedulePage({ params }: { params: Promise<{ link: string }> }) {
  const { link } = await params;
  
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.shareLink, link),
    with: {
      ministry: true,
      sector: true,
      dates: true,
    }
  });

  if (!schedule) {
    notFound();
  }

  // Get servants for this sector to let them identify themselves
  const sectorServants = await db.query.servants.findMany({
    where: eq(servants.sectorId, schedule.sectorId),
    with: {
      user: true
    }
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #0f172a, #1e1b4b)',
      padding: '2rem 1rem'
    }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        <div className="card glass animate-fade-in" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{schedule.name}</h1>
          <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{schedule.ministry.name} - {schedule.sector.name}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Selecione abaixo os dias e horários que você tem disponibilidade para servir.
          </p>
        </div>

        <AvailabilityForm 
          scheduleId={schedule.id} 
          dates={schedule.dates} 
          servants={sectorServants} 
        />
      </div>
    </div>
  );
}
