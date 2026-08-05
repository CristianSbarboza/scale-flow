import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { servants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Calendar } from "lucide-react";
import { getServantOverview } from "@/lib/actions";
import ServantHome from "@/components/ServantHome";
import ServantProfileMenu from "@/components/ServantProfileMenu";
import NotificationBell from "@/components/NotificationBell";

export default async function ServantDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
    with: {
      sector: { with: { ministry: true } }
    }
  });

  if (memberships.length === 0) {
    return <div>Perfil de servo não encontrado.</div>;
  }

  const sectorNames = memberships.map((m) => m.sector.name).join(", ");

  const schedules = await getServantOverview();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <header className="glass servant-header" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="servant-header-full" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>ScaleFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 600 }}>{session.user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{sectorNames}</p>
            </div>
            <NotificationBell />
            <ServantProfileMenu name={session.user?.name ?? ''} sectorName={sectorNames} />
          </div>
        </div>

        <div className="servant-header-mobile-row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={22} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>ScaleFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <NotificationBell />
            <ServantProfileMenu name={session.user?.name ?? ''} sectorName={sectorNames} />
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <ServantHome schedules={schedules} />
      </main>
    </div>
  );
}
