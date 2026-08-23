"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, Users, Activity } from "lucide-react";
import { getSectorById } from "@/lib/actions/sectors";
import BackLink from "@/components/ui/BackLink";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import StatCard from "@/components/ui/StatCard";

interface Sector {
  id: number;
  name: string;
  ministry: { id: number; name: string } | null;
  servants: { id: number; user: { name: string; username: string | null; email: string | null } }[];
}

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
      />

      <div className="mb-10 flex flex-wrap gap-5">
        <StatCard label="Total de Servos" value={servants.length} className="flex-[1_1_160px]" />
        <Card glass className="flex flex-[1_1_160px] items-center gap-2">
          <Badge tone="success" icon={<Activity size={16} />}>
            Setor Ativo
          </Badge>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <SectionLabel as="span">Servos</SectionLabel>
        </div>
        <div className="grid gap-2">
          {servants.map((srv) => (
            <Card key={srv.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{srv.user.name}</p>
                <p className="text-[0.8125rem] text-muted-foreground">
                  {srv.user.username || srv.user.email || "-"}
                </p>
              </div>
              <Badge>Ativo</Badge>
            </Card>
          ))}
          {servants.length === 0 && (
            <EmptyState>Nenhum servo vinculado a este setor.</EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
