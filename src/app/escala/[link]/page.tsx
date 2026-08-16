import { db } from "@/db";
import { schedules, servants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Lock } from "lucide-react";
import AvailabilityForm from "./AvailabilityForm";

const PAGE_BACKGROUND = 'radial-gradient(circle at top right, #1a0f05, #0a0908)';

// Escala privada e o visitante não pode responder: explica o porquê em vez de
// mostrar um formulário que o servidor vai recusar no envio.
function BlockedNotice({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: PAGE_BACKGROUND, padding: '2rem 1rem' }}>
      <div className="w-full max-w-[600px] mx-auto px-6">
        <div className="card glass animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <Lock size={32} color="var(--primary)" style={{ margin: '0 auto 1.25rem' }} />
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>{message}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ link: string }>;
  searchParams: Promise<{ from?: string; servantId?: string }>;
}

export default async function PublicSchedulePage({ params, searchParams }: PageProps) {
  const { link } = await params;
  const { from, servantId } = await searchParams;

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

  const sortedDates = [...schedule.dates].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  const session = await getServerSession(authOptions);

  // Escala privada: só servos do setor, logados, respondem — e só por si mesmos.
  // A regra é reforçada em `saveAvailability`; aqui é a versão visível dela.
  if (schedule.visibility === "private") {
    if (!session) {
      return (
        <BlockedNotice
          title="Escala privada"
          message="Esta escala é restrita aos servos do setor. Entre com sua conta para informar sua disponibilidade."
          action={
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/escala/${link}`)}`}
              className="btn btn-primary"
              style={{ marginTop: '1.5rem', display: 'inline-flex' }}
            >
              Fazer login
            </Link>
          }
        />
      );
    }

    const [me] = await db.query.servants.findMany({
      where: and(eq(servants.sectorId, schedule.sectorId), eq(servants.userId, session.user.id)),
      columns: { id: true },
      with: { user: { columns: { name: true } } },
      limit: 1,
    });

    if (!me) {
      return (
        <BlockedNotice
          title="Escala privada"
          message={`Sua conta não está vinculada ao setor ${schedule.sector.name}. Fale com o líder do ministério para ser adicionado.`}
        />
      );
    }

    return (
      <SchedulePage
        schedule={schedule}
        dates={sortedDates}
        servants={[me]}
        initialServantId={String(me.id)}
        lockedServantName={me.user.name}
        returnToServant={from === "servant"}
      />
    );
  }

  // Get servants for this sector to let them identify themselves.
  // Só o nome vai para o cliente — esta página é pública.
  const sectorServants = await db.query.servants.findMany({
    where: eq(servants.sectorId, schedule.sectorId),
    columns: { id: true },
    with: {
      user: { columns: { name: true } }
    }
  });

  return (
    <SchedulePage
      schedule={schedule}
      dates={sortedDates}
      servants={sectorServants}
      initialServantId={servantId}
      returnToServant={from === "servant"}
    />
  );
}

interface SchedulePageProps {
  schedule: { name: string; ministry: { name: string }; sector: { name: string } };
  dates: Array<{ id: number; date: string; startTime: string }>;
  servants: Array<{ id: number; user: { name: string } }>;
  initialServantId?: string;
  lockedServantName?: string;
  returnToServant: boolean;
}

function SchedulePage({ schedule, dates, servants, initialServantId, lockedServantName, returnToServant }: SchedulePageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: PAGE_BACKGROUND,
      padding: '2rem 1rem'
    }}>
      <div className="w-full max-w-[600px] mx-auto px-6">
        <div className="card glass animate-fade-in" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{schedule.name}</h1>
          <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{schedule.ministry.name} - {schedule.sector.name}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Selecione abaixo os dias e horários que você tem disponibilidade para servir.
          </p>
        </div>

        <AvailabilityForm
          dates={dates}
          servants={servants}
          initialServantId={initialServantId}
          lockedServantName={lockedServantName}
          returnToServant={returnToServant}
        />
      </div>
    </div>
  );
}
