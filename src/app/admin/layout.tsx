import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbarProvider } from "@/components/AdminTopbarContext";
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

  return (
    <AdminTopbarProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar role={session.user.role} />
        <main className="admin-main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </AdminTopbarProvider>
  );
}
