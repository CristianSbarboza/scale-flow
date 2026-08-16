import { Church, Layers, Users, Calendar } from "lucide-react";
import StatsRule, { type StatItem } from "@/components/ui/StatsRule";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import ListRow from "@/components/ui/ListRow";
import Panel from "@/components/ui/Panel";
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
      userId: servants.userId,
      name: users.name,
      sectorName: sectors.name,
    })
    .from(servants)
    .innerJoin(users, eq(servants.userId, users.id))
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .where(isLeader ? eq(sectors.ministryId, ministryId) : undefined)
    .orderBy(desc(servants.createdAt))
    .limit(5);

  const latestSectors = await db
    .select({
      id: sectors.id,
      name: sectors.name,
      ministryName: ministries.name,
    })
    .from(sectors)
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(isLeader ? eq(sectors.ministryId, ministryId) : undefined)
    .orderBy(desc(sectors.createdAt))
    .limit(5);

  // Líder lidera um ministério só — o painel não teria o que listar.
  const latestMinistries = isLeader
    ? []
    : await db
        .select({
          id: ministries.id,
          name: ministries.name,
          leaderName: users.name,
        })
        .from(ministries)
        .innerJoin(users, eq(ministries.leaderId, users.id))
        .orderBy(desc(ministries.createdAt))
        .limit(5);

  const ministryCount = isLeader ? null : (await db.select({ value: count() }).from(ministries))[0];

  const stats: StatItem[] = [
    ...(ministryCount
      ? [{ icon: Church, label: "Ministérios", value: ministryCount.value, href: "/admin/ministries" }]
      : []),
    { icon: Layers, label: "Setores", value: sectorCount.value, href: "/admin/sectors" },
    { icon: Users, label: "Servos", value: servantCount.value, href: "/admin/servants" },
    { icon: Calendar, label: "Escalas Ativas", value: scheduleCount.value, href: "/admin/schedules" },
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Últimas Escalas Criadas">
          {latestSchedules.length > 0 ? (
            latestSchedules.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                subtitle={`${s.ministryName} — ${s.sectorName}`}
                href="/admin/schedules"
              />
            ))
          ) : (
            <EmptyState>Nenhuma escala ativa no momento.</EmptyState>
          )}
        </Panel>

        <Panel title="Servos Recentemente Cadastrados">
          {latestServants.length > 0 ? (
            latestServants.map((s) => (
              <ListRow
                key={s.id}
                leading={<Avatar name={s.name} size="sm" />}
                title={s.name}
                subtitle={s.sectorName}
                href={`/admin/servants/${s.userId}`}
              />
            ))
          ) : (
            <EmptyState>Aguardando novos cadastros.</EmptyState>
          )}
        </Panel>

        {!isLeader && (
          <Panel title="Ministérios">
            {latestMinistries.length > 0 ? (
              latestMinistries.map((m) => (
                <ListRow
                  key={m.id}
                  leading={<Church size={16} className="text-primary" />}
                  title={m.name}
                  subtitle={`Líder: ${m.leaderName}`}
                  href={`/admin/ministries/${m.id}`}
                />
              ))
            ) : (
              <EmptyState>Nenhum ministério cadastrado.</EmptyState>
            )}
          </Panel>
        )}

        <Panel title="Setores">
          {latestSectors.length > 0 ? (
            latestSectors.map((s) => (
              <ListRow
                key={s.id}
                leading={<Layers size={16} className="text-primary" />}
                title={s.name}
                subtitle={s.ministryName}
                href={`/admin/sectors/${s.id}`}
              />
            ))
          ) : (
            <EmptyState>Nenhum setor cadastrado.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}
