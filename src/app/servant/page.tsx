import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { servants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Calendar, User } from "lucide-react";
import { getServantOverview } from "@/lib/actions";
import ServantHome from "@/components/ServantHome";
import ServantProfileMenu from "@/components/ServantProfileMenu";

export default async function ServantDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, session.user.id),
    with: {
      sector: { with: { ministry: true } }
    }
  });

  if (!servant) {
    return <div>Perfil de servo não encontrado.</div>;
  }

  const schedules = await getServantOverview();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <header className="glass servant-header" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="servant-header-full" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>ScaleFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 600 }}>{session.user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{servant.sector.name}</p>
              </div>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.75rem' }}>
                <User size={20} color="white" />
              </div>
            </div>
            <Link href="/api/auth/signout" className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }}>
              Sair
            </Link>
          </div>
        </div>

        <div className="servant-header-mobile-row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>Minha Agenda</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Dias confirmados e escalas do seu setor.</p>
          </div>
          <ServantProfileMenu name={session.user?.name ?? ''} sectorName={servant.sector.name} />
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="servant-page-title" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Minha Agenda</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Acompanhe seus dias confirmados e responda às escalas do seu setor.</p>
        </div>

        <ServantHome schedules={schedules} />
      </main>
    </div>
  );
}
