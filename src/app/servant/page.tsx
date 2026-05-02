import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { servants, scheduleAssignments, scheduleAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Clock, MapPin, User, Calendar } from "lucide-react";

interface Assignment {
  id: number;
  date: {
    date: string;
    startTime: string;
    endTime: string;
    schedule: { name: string; ministry: { name: string }; sector: { name: string } };
  };
}

interface Availability {
  id: number;
  date: {
    date: string;
    startTime: string;
    endTime: string;
    schedule: { name: string; ministry: { name: string }; sector: { name: string } };
  };
}

export default async function ServantDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Get servant profile
  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, userId),
    with: {
      sector: {
        with: { ministry: true }
      }
    }
  });

  if (!servant) {
    return <div>Perfil de servo não encontrado.</div>;
  }

  // Get assignments
  const rawAssignments = await db.query.scheduleAssignments.findMany({
    where: eq(scheduleAssignments.servantId, servant.id),
    with: {
      date: {
        with: {
          schedule: { with: { ministry: true, sector: true } }
        }
      }
    }
  });
  const assignments = rawAssignments as unknown as Assignment[];

  // Get pending availabilities (not assigned yet)
  const rawAvailabilities = await db.query.scheduleAvailability.findMany({
    where: eq(scheduleAvailability.servantId, servant.id),
    with: {
      date: {
        with: {
          schedule: { with: { ministry: true, sector: true } }
        }
      }
    }
  });
  const availabilities = rawAvailabilities as unknown as Availability[];

  const pendingAvailabilities = availabilities.filter(av => 
    !assignments.some(as => as.date.date === av.date.date && as.date.startTime === av.date.startTime)
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <header className="glass" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex">
          <Calendar size={24} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1.25rem', marginLeft: '0.5rem' }}>ScaleFlow</span>
        </div>
        <div className="flex" style={{ gap: '1.5rem' }}>
          <div className="flex">
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 600 }}>{session.user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{servant.sector.name}</p>
            </div>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.75rem' }}>
              <User size={20} color="white" />
            </div>
          </div>
          <a href="/api/auth/signout" className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }}>
            Sair
          </a>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Minha Agenda</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Confira abaixo os dias em que você está escalado.</p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {assignments.length > 0 ? assignments.map((as) => (
            <div key={as.id} className="card glass animate-fade-in" style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '0.25rem 0.75rem', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: '#10b981',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem'
                }}>
                  CONFIRMADO
                </div>
                <h3 style={{ fontSize: '1.25rem' }}>{new Date(as.date.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
              </div>

              <div className="grid" style={{ gap: '0.75rem' }}>
                <div className="flex" style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  <Clock size={16} style={{ marginRight: '0.5rem' }} />
                  <span>{as.date.startTime} - {as.date.endTime}</span>
                </div>
                <div className="flex" style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  <MapPin size={16} style={{ marginRight: '0.5rem' }} />
                  <span>{as.date.schedule.ministry.name} - {as.date.schedule.sector.name}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="card glass" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--muted-foreground)' }}>Nenhuma escala confirmada ainda.</p>
            </div>
          )}
        </div>

        {pendingAvailabilities.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Disponibilidades Enviadas</h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {pendingAvailabilities.map((av) => (
                <div key={av.id} className="card glass" style={{ opacity: 0.8, borderLeft: '4px solid var(--primary)' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{new Date(av.date.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {av.date.startTime} - {av.date.endTime} | {av.date.schedule.name}
                  </p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                    AGUARDANDO CONFIRMAÇÃO
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
