import { Church, LayoutGrid, Users, Calendar } from "lucide-react";
import StatsRule, { type StatItem } from "@/components/ui/StatsRule";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import ListRow from "@/components/ui/ListRow";
import Panel from "@/components/ui/Panel";
import { db } from "@/db";
import { ministries, sectors, servants, schedules, users } from "@/db/schema";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMyChurch } from "@/lib/actions/church";
import PageHeader from "@/components/ui/PageHeader";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isLeader = session.user.role === "leader";
  const churchId = session.user.churchId;
  const church = await getMyChurch();

  /**
   * O escopo do painel, numa expressão só.
   *
   * Este arquivo consulta o banco direto, sem passar pelas server actions, e
   * por isso não herda nenhum dos filtros de `src/lib/actions/`. Antes, o ramo
   * de admin era `undefined` — cláusula ausente — em sete consultas. Agora a
   * igreja é obrigatória em todas, e o ministério só se soma a ela.
   */
  const ministry = isLeader
    ? await db.query.ministries.findFirst({
        where: and(eq(ministries.leaderId, session.user.id), eq(ministries.churchId, churchId)),
      })
    : null;
  const ministryId = ministry?.id ?? -1; // líder sem ministério: filtra por id inexistente, nunca por nada
  const scoped = (extra?: SQL) =>
    isLeader ? and(eq(ministries.churchId, churchId), extra) : eq(ministries.churchId, churchId);

  // Contagens: todas passam por `ministries`, porque é lá que mora a igreja.
  const [sectorCount] = await db.select({ value: count() }).from(sectors)
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(scoped(eq(sectors.ministryId, ministryId)));

  const [servantCount] = await db.select({ value: count() }).from(servants)
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(scoped(eq(sectors.ministryId, ministryId)));

  const [scheduleCount] = await db.select({ value: count() }).from(schedules)
    .innerJoin(ministries, eq(schedules.ministryId, ministries.id))
    .where(scoped(eq(schedules.ministryId, ministryId)));

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
    .where(scoped(eq(schedules.ministryId, ministryId)))
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
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(scoped(eq(sectors.ministryId, ministryId)))
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
    .where(scoped(eq(sectors.ministryId, ministryId)))
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
        .where(eq(ministries.churchId, churchId))
        .orderBy(desc(ministries.createdAt))
        .limit(5);

  const ministryCount = isLeader
    ? null
    : (await db.select({ value: count() }).from(ministries)
        .where(eq(ministries.churchId, churchId)))[0];

  const stats: StatItem[] = [
    ...(ministryCount
      ? [{ icon: Church, label: "Ministérios", value: ministryCount.value, href: "/admin/ministries" }]
      : []),
    { icon: LayoutGrid, label: "Setores", value: sectorCount.value, href: "/admin/sectors" },
    { icon: Users, label: "Servos", value: servantCount.value, href: "/admin/servants" },
    { icon: Calendar, label: "Escalas Ativas", value: scheduleCount.value, href: "/admin/schedules" },
  ];

  return (
    <div className="animate-fade-in">
      {/* A igreja vai no subtítulo, não no título: o título diz o que a tela
          é, o subtítulo diz de quem são os números que ela mostra. */}
      <PageHeader
        className="mb-6"
        title={`Painel Administrativo${ministry ? ` — ${ministry.name}` : ""}`}
        subtitle={church.name}
      />

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
                leading={<LayoutGrid size={16} className="text-primary" />}
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
