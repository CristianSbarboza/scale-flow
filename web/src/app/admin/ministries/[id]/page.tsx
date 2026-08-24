"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Users, Mail, Church, ArrowUpRight, Edit3, ShieldAlert, Copy, Check } from "lucide-react";
import { getMinistryById, updateMinistryDetails, transferMinistryLeader } from "@/lib/actions/ministries";
import Field from "@/components/ui/Field";
import TextareaField from "@/components/ui/TextareaField";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import StatsRule from "@/components/ui/StatsRule";

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
  const { showToast } = useToast();
  const askConfirm = useConfirm();

  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // A troca de líder é um formulário à parte, fechado por padrão. Aberto por
  // acidente ele não faz nada; só o botão de confirmar transfere.
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [transferring, setTransferring] = useState(false);

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
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [id, router]);

  const recarregar = async () => {
    const atualizado = await getMinistryById(id);
    setMinistry(atualizado as unknown as Ministry);
    return atualizado as unknown as Ministry;
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMinistryDetails(id, name, description);
      await recarregar();
      setEditOpen(false);
      showToast("Ministério atualizado.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    // O aviso vem ANTES da gravação, não depois: o painel de senha aparecendo
    // era o único sinal de que uma conta tinha sido criada, e já era tarde.
    const ok = await askConfirm({
      title: "Trocar líder do ministério",
      message:
        `A liderança de ${ministry?.name} passa de ${ministry?.leader.name} para ${leaderName.trim()}. ` +
        `Se ${leaderEmail.trim()} ainda não tiver conta, uma será criada com senha gerada, ` +
        `que aparece uma única vez para você repassar.`,
      confirmLabel: "Trocar líder",
    });
    if (!ok) return;

    setTransferring(true);
    try {
      const result = await transferMinistryLeader(id, leaderName, leaderEmail);
      await recarregar();
      setTransferOpen(false);
      if (result.password) {
        setGeneratedPassword(result.password);
      } else {
        showToast(result.unchanged ? "Nome do líder atualizado." : "Líder trocado.", "success");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao trocar o líder.", "error");
    } finally {
      setTransferring(false);
    }
  };

  // "Cancelar" não precisa de botão: o Salvar simplesmente não habilita.
  const semMudanca = name.trim() === ministry?.name
    && description.trim() === (ministry?.description ?? "");

  const abrirEdicao = () => {
    // Recarrega os campos do que está gravado: se a pessoa abriu, digitou e
    // fechou sem salvar, o rascunho não pode reaparecer na próxima vez.
    setName(ministry?.name ?? "");
    setDescription(ministry?.description ?? "");
    setEditOpen(true);
  };

  const abrirTransferencia = () => {
    // Nasce com os dados atuais: o caso comum é corrigir a grafia do nome,
    // não digitar uma pessoa nova do zero.
    setLeaderName(ministry?.leader.name ?? "");
    setLeaderEmail(ministry?.leader.email ?? "");
    setTransferOpen(true);
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
          <div className="min-w-0">
            <h1 style={{ fontSize: "2rem" }}>{ministry.name}</h1>
            {/* Sem texto de enfeite quando não há descrição: o antigo
                "Gerenciamento estratégico e visão ministerial deste
                departamento" parecia conteúdo e não era de ninguém. */}
            {ministry.description && (
              <p style={{ color: "var(--muted-foreground)" }}>{ministry.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={abrirEdicao} className="shrink-0">
          <Edit3 size={16} />
          Editar
        </Button>
      </header>

      {/* Mesma régua de /admin e da tela do servo. Eram dois cards de 120px de
          altura para exibir dois números — a contagem é referência, não o
          assunto da tela. */}
      <StatsRule
        className="mb-8"
        items={[
          { icon: LayoutGrid, label: "Setores", value: ministry.sectors?.length || 0 },
          { icon: Users, label: "Servos", value: allServants.length },
        ]}
      />

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
            onClick={() => setGeneratedPassword(null)}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Entendi, pode fechar
          </button>
        </div>
      )}

      <div className="card glass grid gap-4" style={{ marginBottom: "2.5rem" }}>
          <p style={sectionLabelStyle}>Líder</p>

          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={ministry.leader.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ministry.leader.name}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Mail size={14} className="shrink-0" />
                {ministry.leader.email}
              </p>
            </div>
            {!transferOpen && (
              <Button variant="outline" onClick={abrirTransferencia} className="shrink-0">
                <Edit3 size={16} />
                Trocar líder
              </Button>
            )}
          </div>

          {transferOpen && (
            <form onSubmit={handleTransfer} className="grid gap-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Trocar o e-mail transfere a liderança para outra pessoa. Se o e-mail ainda não
                tiver conta, uma será criada com senha gerada.
              </p>
              <Field
                label="Nome do líder"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                required
              />
              <Field
                label="E-mail do líder"
                type="email"
                value={leaderEmail}
                onChange={(e) => setLeaderEmail(e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={transferring || !leaderName.trim() || !leaderEmail.trim()}>
                  {transferring ? "Trocando..." : "Confirmar troca"}
                </Button>
                <Button variant="ghost" onClick={() => setTransferOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
      </div>

      {editOpen && (
        <AdminCreateModal title="Editar ministério" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleSaveDetails} className="grid gap-4">
            <Field
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
            <TextareaField
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve este ministério"
            />
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || semMudanca}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </AdminCreateModal>
      )}

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
