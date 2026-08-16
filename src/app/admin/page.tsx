import { Church, Layers, Users, Calendar } from "lucide-react";
import StatsRule, { type StatItem } from "@/components/ui/StatsRule";
import { db } from "@/db";
import { ministries, sectors, servants, schedules, users } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const isLeader = session?.user.role === "leader";

  const ministry = isLeader
    ? await db.query.ministries.findFirst({ where: eq(ministries.leaderId, session!.user.id) })
    : null;
  const ministryId = ministry?.id ?? -1; // no ministry match found: filter to a non-existent id instead of showing global data

  const [sectorCount] = await db.select({ value: count() }).from(sectors)
    .where(isLeader ? eq(sectors.ministryId, ministryId) : undefined);

  const [servantCount] = await db.select({ value: count() }).from(servants)
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .where(isLeader ? eq(sectors.ministryId, ministryId) : undefined);

  const [scheduleCount] = await db.select({ value: count() }).from(schedules)
    .where(isLeader ? eq(schedules.ministryId, ministryId) : undefined);

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
    .where(isLeader ? eq(schedules.ministryId, ministryId) : undefined)
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
    .where(isLeader ? eq(sectors.ministryId, ministryId) : undefined)
    .orderBy(desc(servants.createdAt))
    .limit(5);

  const ministryCount = isLeader ? null : (await db.select({ value: count() }).from(ministries))[0];

  const stats: StatItem[] = [
    ...(ministryCount ? [{ icon: Church, label: "Ministérios", value: ministryCount.value }] : []),
    { icon: Layers, label: "Setores", value: sectorCount.value },
    { icon: Users, label: "Servos", value: servantCount.value },
    { icon: Calendar, label: "Escalas Ativas", value: scheduleCount.value },
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="mb-2 text-3xl">
          Painel Administrativo{ministry ? ` — ${ministry.name}` : ""}
        </h1>
        <p className="text-muted-foreground">Bem-vindo de volta! Aqui está o resumo da sua gestão.</p>
      </header>

      <StatsRule items={stats} />

      <div className="admin-panel-layout" style={{ '--panel-ratio': '2fr 1fr' } as React.CSSProperties}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Últimas Escalas Criadas</h3>
          {latestSchedules.length > 0 ? (
            <div className="grid gap-6" style={{ gap: '1rem' }}>
              {latestSchedules.map((s) => (
                <div key={s.id} className="flex items-center gap-4 justify-between" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
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
            <div className="grid gap-6" style={{ gap: '1rem' }}>
              {latestServants.map((s) => (
                <div key={s.id} className="flex items-center gap-4" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
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
