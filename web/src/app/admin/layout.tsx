import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbarProvider } from "@/components/AdminTopbarContext";
import { ChurchProvider } from "@/components/ChurchContext";
import { getMyChurch } from "@/lib/actions/church";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    redirect("/login");
  }

  // Uma leitura por navegação, aqui em cima. As telas de dentro consomem pelo
  // contexto em vez de cada uma consultar o banco.
  const church = await getMyChurch();

  return (
    <ChurchProvider church={church}>
      <AdminTopbarProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <AdminSidebar role={session.user.role} />
          <main className="admin-main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </AdminTopbarProvider>
    </ChurchProvider>
  );
}
