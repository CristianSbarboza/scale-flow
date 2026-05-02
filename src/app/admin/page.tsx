import { StackedStats } from "@/components/StackedStats";
import { db } from "@/db";
import { ministries, sectors, servants, schedules, users } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";

export default async function AdminDashboard() {
  const [ministryCount] = await db.select({ value: count() }).from(ministries);
  const [sectorCount] = await db.select({ value: count() }).from(sectors);
  const [servantCount] = await db.select({ value: count() }).from(servants);
  const [scheduleCount] = await db.select({ value: count() }).from(schedules);

  const latestSchedules = await db
    .select({
      id: schedules.id,
      name: schedules.name,
      createdAt: schedules.createdAt,
      ministryName: ministries.name,
      sectorName: sectors.name,
    })
    .from(schedules)
    .innerJoin(ministries, eq(schedules.ministryId, ministries.id))
    .innerJoin(sectors, eq(schedules.sectorId, sectors.id))
    .orderBy(desc(schedules.createdAt))
    .limit(5);

  const latestServants = await db
    .select({
      id: servants.id,
      name: users.name,
      sectorName: sectors.name,
    })
    .from(servants)
    .innerJoin(users, eq(servants.userId, users.id))
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .orderBy(desc(servants.createdAt))
    .limit(5);

  const statsData = {
    ministries: ministryCount.value,
    sectors: sectorCount.value,
    servants: servantCount.value,
    schedules: scheduleCount.value,
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Painel Administrativo</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Bem-vindo de volta! Aqui está o resumo da sua gestão.</p>
      </header>

      <StackedStats data={statsData} />

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: '2.5rem' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Últimas Escalas Criadas</h3>
          {latestSchedules.length > 0 ? (
            <div className="grid" style={{ gap: '1rem' }}>
              {latestSchedules.map((s) => (
                <div key={s.id} className="flex justify-between" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{s.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.ministryName} - {s.sectorName}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {new Date(s.createdAt!).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>
              Nenhuma escala ativa no momento.
            </p>
          )}
        </div>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Servos Recentemente Cadastrados</h3>
          {latestServants.length > 0 ? (
            <div className="grid" style={{ gap: '1rem' }}>
              {latestServants.map((s) => (
                <div key={s.id} className="flex" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', marginRight: '0.75rem' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.sectorName}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>
              Aguardando novos cadastros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
