"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, Users, Star, Mail, Edit3 } from "lucide-react";
import { getSectorById, updateSector } from "@/lib/actions/sectors";
import AdminCreateModal from "@/components/AdminCreateModal";
import Avatar from "@/components/ui/Avatar";
import BackLink from "@/components/ui/BackLink";
import Button from "@/components/ui/Button";
import DataPanel from "@/components/ui/DataPanel";
import Field from "@/components/ui/Field";
import PageHeader from "@/components/ui/PageHeader";
import StatsRule from "@/components/ui/StatsRule";
import { useToast } from "@/components/Toast";

interface Servant {
  id: number;
  isCoordinator: boolean;
  user: { name: string; username: string | null; email: string | null };
}

interface Sector {
  id: number;
  name: string;
  ministry: { id: number; name: string } | null;
  leader: { name: string; email: string | null };
  servants: Servant[];
}

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const { showToast } = useToast();

  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const s = await getSectorById(id);
    if (!s) {
      router.replace("/admin/sectors");
      return;
    }
    setSector(s as unknown as Sector);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading || !sector) return null;

  const servants = sector.servants || [];
  const coordenadores = servants.filter((s) => s.isCoordinator);

  const abrirEdicao = () => {
    // Recarrega do que está gravado: digitar, fechar sem salvar e reabrir não
    // pode trazer o rascunho de volta.
    setName(sector.name);
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSector(id, name);
      await load();
      setEditOpen(false);
      showToast("Setor atualizado.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <BackLink href="/admin/sectors">Voltar para Setores</BackLink>

      <PageHeader
        icon={<LayoutGrid size={28} />}
        title={sector.name}
        subtitle={
          sector.ministry && (
            <Link href={`/admin/ministries/${sector.ministry.id}`} className="font-semibold text-primary">
              {sector.ministry.name}
            </Link>
          )
        }
        action={
          <Button variant="outline" onClick={abrirEdicao} className="shrink-0">
            <Edit3 size={16} />
            Editar
          </Button>
        }
      />

      <StatsRule
        className="mb-8"
        items={[
          { icon: Users, label: "Servos", value: servants.length },
          { icon: Star, label: "Coordenadores", value: coordenadores.length },
        ]}
      />

      {/* Só leitura, sem botão de editar: o líder é do ministério, não deste
          setor. Trocá-lo daqui mudaria a chefia de todos os setores irmãos
          sem que a tela deixasse isso claro — a troca vive em /admin/ministries. */}
      <div className="card glass mb-6 grid max-w-[640px] gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.03em] text-muted-foreground">
          Líder do ministério
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={sector.leader.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{sector.leader.name}</p>
            {sector.leader.email && (
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Mail size={14} className="shrink-0" />
                {sector.leader.email}
              </p>
            )}
          </div>
          {sector.ministry && (
            <Link
              href={`/admin/ministries/${sector.ministry.id}`}
              className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Ver ministério
            </Link>
          )}
        </div>
      </div>

      <div className="grid max-w-[640px] gap-6">
        <DataPanel<Servant>
          title="Coordenadores"
          columns={[
            {
              header: "Nome",
              primary: true,
              cell: (s) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.user.username || s.user.email || "-"}
                  </p>
                </div>
              ),
            },
          ]}
          rows={coordenadores}
          rowKey={(s) => s.id}
          empty="Nenhum coordenador neste setor."
        />

        <DataPanel<Servant>
          title="Servos"
          columns={[
            {
              header: "Nome",
              primary: true,
              cell: (s) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.user.username || s.user.email || "-"}
                  </p>
                </div>
              ),
            },
            {
              header: "Coordenador",
              mobileRow: 1,
              cell: (s) =>
                s.isCoordinator ? (
                  <Star size={16} className="text-primary" fill="var(--primary)" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                ),
            },
          ]}
          rows={servants}
          rowKey={(s) => s.id}
          empty="Nenhum servo vinculado a este setor."
        />
      </div>

      {editOpen && (
        <AdminCreateModal title="Editar setor" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleSave} className="grid gap-4">
            <Field
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || name.trim() === sector.name}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </AdminCreateModal>
      )}
    </div>
  );
}
