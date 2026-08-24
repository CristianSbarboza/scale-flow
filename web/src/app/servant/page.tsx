import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { servants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServantOverview } from "@/lib/actions/availability";
import { mapCoordinatorSectors } from "@/lib/scope";
import ServantShell from "@/components/ServantShell";
import { type ServantTab } from "@/components/ServantHome";

/**
 * Abas que um link externo pode abrir. "coordinator" fica de fora: nem todo
 * servo a tem, e um link para ela cairia numa aba inexistente.
 */
const ABAS_POR_URL: readonly ServantTab[] = ["calendar", "next", "month", "all"];

export default async function ServantDashboard({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // `?aba=next` abre direto onde o servo preenche disponibilidade — é para lá
  // que o aviso de escala publicada aponta. Lido aqui, e não por
  // `useSearchParams` no cliente, porque a doc do Next reserva o hook para o
  // que é só do cliente e isto decide o estado inicial da tela.
  const { aba } = await searchParams;
  const initialTab = ABAS_POR_URL.includes(aba as ServantTab) ? (aba as ServantTab) : undefined;

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
  const currentUser = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  const ownColor = currentUser?.color ?? null;

  const coordinatorSectors = mapCoordinatorSectors(memberships);

  return (
    <ServantShell
      name={session.user?.name ?? ""}
      sectorName={sectorNames}
      color={ownColor}
      schedules={schedules}
      coordinatorSectors={coordinatorSectors}
      initialTab={initialTab}
    />
  );
}
