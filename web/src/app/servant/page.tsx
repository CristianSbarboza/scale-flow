import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { servants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServantOverview } from "@/lib/actions/availability";
import { mapCoordinatorSectors } from "@/lib/scope";
import ServantShell from "@/components/ServantShell";

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
    />
  );
}
