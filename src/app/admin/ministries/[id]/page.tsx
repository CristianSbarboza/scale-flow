"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Users, Mail, Church, ArrowUpRight, Edit3, Save, ShieldAlert, Copy, Check } from "lucide-react";
import { getMinistryById, updateMinistry } from "@/lib/actions/ministries";

interface Ministry {
  id: number;
  name: string;
  description: string | null;
  leader: { name: string; email: string };
  sectors: {
    id: number;
    name: string;
    servants: { id: number; user: { name: string; username: string | null; email: string | null } }[];
  }[];
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

export default function MinistryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");

  useEffect(() => {
    let isMounted = true;
    getMinistryById(id).then((m) => {
      if (!isMounted) return;
      if (!m) {
        router.replace("/admin/ministries");
        return;
      }
      const typed = m as unknown as Ministry;
      setMinistry(typed);
      setName(typed.name);
      setDescription(typed.description || "");
      setLeaderName(typed.leader.name);
      setLeaderEmail(typed.leader.email);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [id, router]);

  const handleUpdate = async () => {
    setSaving(true);
    const result = await updateMinistry(id, name, description, leaderName, leaderEmail);
    if (result?.password) {
      setGeneratedPassword(result.password);
      setSaving(false);
    } else {
      const refreshed = await getMinistryById(id);
      setMinistry(refreshed as unknown as Ministry);
      setSaving(false);
      setIsEditing(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !ministry) return null;

  const allServants = (ministry.sectors || []).flatMap(s => (s.servants || []).map(srv => ({
    ...srv,
    sectorName: s.name
  })));

  return (
    <div className="animate-fade-in">
      <Link href="/admin/ministries" style={backLinkStyle}>
        <ArrowLeft size={16} /> Voltar para Ministérios
      </Link>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "var(--radius)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", flexShrink: 0 }}>
            <Church size={28} />
          </div>
          <div>
            {isEditing ? (
              <input
                className="input"
                style={{ fontSize: "1.375rem", fontWeight: 700, padding: "0.375rem 0.5rem", marginBottom: "0.5rem" }}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            ) : (
              <h1 style={{ fontSize: "2rem" }}>{ministry.name}</h1>
            )}
            {isEditing ? (
              <textarea
                className="input"
                style={{ height: "4.5rem" }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descrição do ministério (opcional)"
              />
            ) : (
              <p style={{ color: "var(--muted-foreground)" }}>
                {ministry.description || "Gerenciamento estratégico e visão ministerial deste departamento."}
              </p>
            )}
          </div>
        </div>
        {!generatedPassword && (
          <button
            onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
            disabled={saving}
            className={`btn ${isEditing ? "btn-primary" : "btn-secondary"}`}
          >
            {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
            {isEditing ? (saving ? "Salvando..." : "Salvar") : "Editar"}
          </button>
        )}
      </header>

      {generatedPassword && (
        <div style={{ padding: "1.25rem", background: "rgba(249, 115, 22, 0.1)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)", marginBottom: "0.75rem" }}>
            <ShieldAlert size={20} />
            <h3 style={{ fontSize: "1rem" }}>Nova Senha Gerada!</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
            Este novo líder ainda não existia no sistema. Por favor, copie e envie esta senha para que ele possa realizar o primeiro acesso:
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--input)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <code style={{ fontSize: "1.125rem", color: "var(--accent)" }}>{generatedPassword}</code>
            <button onClick={copyPassword} style={{ color: copied ? "#10b981" : "var(--muted-foreground)" }}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            onClick={() => { setGeneratedPassword(null); setIsEditing(false); }}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Entendi, pode fechar
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <div className="card glass" style={{ flex: "2 1 260px" }}>
          <p style={{ ...sectionLabelStyle, marginBottom: "0.75rem" }}>Responsável</p>
          {isEditing ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <input className="input" value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="Nome" />
              <input className="input" value={leaderEmail} onChange={e => setLeaderEmail(e.target.value)} placeholder="E-mail" />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, flexShrink: 0 }}>
                  {ministry.leader.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{ministry.leader.name}</p>
                  <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Líder Geral</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                <Mail size={14} />
                {ministry.leader.email}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "1 1 140px", borderLeft: "3px solid var(--primary)" }}>
          <p style={{ ...sectionLabelStyle, marginBottom: "0.25rem" }}>Setores</p>
          <p style={{ fontSize: "2rem", fontWeight: 700 }}>{ministry.sectors?.length || 0}</p>
        </div>
        <div className="card" style={{ flex: "1 1 140px", borderLeft: "3px solid var(--primary)" }}>
          <p style={{ ...sectionLabelStyle, marginBottom: "0.25rem" }}>Total de Servos</p>
          <p style={{ fontSize: "2rem", fontWeight: 700 }}>{allServants.length}</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "2.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <LayoutGrid size={16} color="var(--primary)" />
            <span style={sectionLabelStyle}>Setores</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {(ministry.sectors || []).map(s => (
              <Link key={s.id} href={`/admin/sectors/${s.id}`} className="card" style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <ArrowUpRight size={16} color="var(--muted-foreground)" />
                  <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{s.servants?.length || 0}</span>
                </div>
                <p style={{ fontWeight: 600 }}>{s.name}</p>
                <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", textTransform: "uppercase", marginTop: "0.125rem" }}>Servos</p>
              </Link>
            ))}
            {(ministry.sectors || []).length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Nenhum setor cadastrado ainda.</p>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Users size={16} color="var(--primary)" />
            <span style={sectionLabelStyle}>Servos do Ministério</span>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {allServants.map((srv, i) => (
              <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{srv.user.name}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{srv.user.username || srv.user.email || "-"}</p>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "1rem", background: "var(--muted)" }}>
                  {srv.sectorName}
                </span>
              </div>
            ))}
            {allServants.length === 0 && (
              <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", fontStyle: "italic" }}>
                Nenhum servo neste ministério ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
