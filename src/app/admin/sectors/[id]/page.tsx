"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Users, Activity } from "lucide-react";
import { getSectorById } from "@/lib/actions/sectors";

interface Sector {
  id: number;
  name: string;
  ministry: { id: number; name: string } | null;
  servants: { id: number; user: { name: string; username: string | null; email: string | null } }[];
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  marginBottom: "1.5rem",
};

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getSectorById(id).then((s) => {
      if (!isMounted) return;
      if (!s) {
        router.replace("/admin/sectors");
        return;
      }
      setSector(s as unknown as Sector);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [id, router]);

  if (loading || !sector) return null;

  const servants = sector.servants || [];

  return (
    <div className="animate-fade-in">
      <Link href="/admin/sectors" style={backLinkStyle}>
        <ArrowLeft size={16} /> Voltar para Setores
      </Link>

      <header style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "var(--radius)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", flexShrink: 0 }}>
          <LayoutGrid size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: "2rem" }}>{sector.name}</h1>
          {sector.ministry && (
            <Link href={`/admin/ministries/${sector.ministry.id}`} style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9375rem" }}>
              {sector.ministry.name}
            </Link>
          )}
        </div>
      </header>

      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "1 1 160px", borderLeft: "3px solid var(--primary)" }}>
          <p style={{ ...sectionLabelStyle, marginBottom: "0.25rem" }}>Total de Servos</p>
          <p style={{ fontSize: "2rem", fontWeight: 700 }}>{servants.length}</p>
        </div>
        <div className="card glass" style={{ flex: "1 1 160px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity size={16} color="#10b981" />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#10b981" }}>Setor Ativo</span>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Users size={16} color="var(--primary)" />
          <span style={sectionLabelStyle}>Servos</span>
        </div>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {servants.map((srv) => (
            <div key={srv.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600 }}>{srv.user.name}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{srv.user.username || srv.user.email || "-"}</p>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>Ativo</span>
            </div>
          ))}
          {servants.length === 0 && (
            <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", fontStyle: "italic" }}>
              Nenhum servo vinculado a este setor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
