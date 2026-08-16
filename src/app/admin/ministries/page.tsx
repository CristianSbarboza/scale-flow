"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createMinistry, getMinistries } from "@/lib/actions/ministries";
import { Church, Plus } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import GeneratedPassword from "@/components/ui/GeneratedPassword";
import Field from "@/components/ui/Field";
import TextareaField from "@/components/ui/TextareaField";
import SectionLabel from "@/components/ui/SectionLabel";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

interface Ministry {
  id: number;
  name: string;
  description: string | null;
  leader: {
    name: string;
    email: string;
  };
  sectors: {
    id: number;
    name: string;
    servants: {
      id: number;
      user: { name: string; username: string | null; email: string | null };
    }[];
  }[];
}

export default function MinistriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setAction } = useAdminTopbar();

  useEffect(() => {
    setAction(
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="btn btn-primary"
      >
        <Plus size={16} /> Cadastrar
      </button>
    );
    return () => setAction(null);
  }, [setAction]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role !== "admin") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const min = await getMinistries();
        if (isMounted) {
          setMinistries(min as unknown as Ministry[]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await createMinistry(name, description, leaderName, leaderEmail);
    
    if (result.password) {
      setGeneratedPassword(result.password);
    } else {
      setGeneratedPassword("");
    }

    setName("");
    setDescription("");
    setLeaderName("");
    setLeaderEmail("");
    
    const min = await getMinistries();
    setMinistries(min as unknown as Ministry[]);
    setLoading(false);
  };


  const filteredMinistries = ministries.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (status !== "authenticated" || session?.user.role !== "admin") {
    return null;
  }

  const formContent = (
    <>
      <form onSubmit={handleCreate} className="grid gap-6">
        <Field
          label="Nome do Ministério"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Adoração"
          required
        />
        <TextareaField
          label="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Opcional..."
        />
        <div className="my-4 rounded-lg bg-muted p-4">
          <SectionLabel className="mb-4 text-primary">Dados do Líder</SectionLabel>
          <div className="grid gap-4">
            <Field
              label="Nome do Líder"
              value={leaderName}
              onChange={e => setLeaderName(e.target.value)}
              required
            />
            <Field
              label="Email do Líder"
              type="email"
              value={leaderEmail}
              onChange={e => setLeaderEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          <Plus size={18} />
          {loading ? "Salvando..." : "Adicionar Ministério"}
        </Button>
      </form>

      {generatedPassword && (
        <GeneratedPassword
          password={generatedPassword}
          title="Senha Gerada para o Líder"
          description="Esta pessoa é nova no sistema. Passe esta senha para ela logar."
        />
      )}
    </>
  );

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Ministérios</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Gerencie os ministérios da sua igreja.</p>
      </header>

      <div className="admin-panel-layout">
        <FormPanel title="Novo Ministério">{formContent}</FormPanel>

        <DataPanel
          title="Ministérios Cadastrados"
          toolbar={<SearchInput value={searchTerm} onChange={setSearchTerm} />}
          rows={filteredMinistries}
          rowKey={(m) => m.id}
          onRowClick={(m) => router.push(`/admin/ministries/${m.id}`)}
          empty="Nenhum ministério encontrado para a pesquisa."
          columns={[
            {
              header: "Ministério",
              primary: true,
              cell: (m) => (
                <div className="flex items-center gap-2">
                  <Church size={14} className="text-primary" />
                  <span>{m.name}</span>
                </div>
              ),
            },
            {
              header: "Líder",
              cell: (m) => <span className="text-muted-foreground">{m.leader?.name || "N/A"}</span>,
            },
            {
              header: "Setores",
              cell: (m) => (
                <span className="rounded-full bg-muted px-2 py-1 text-xs">{m.sectors?.length || 0}</span>
              ),
            },
            {
              header: "Servos",
              cell: (m) => (
                <span className="text-muted-foreground">
                  {m.sectors?.reduce((acc, sec) => acc + (sec.servants?.length || 0), 0) || 0}
                </span>
              ),
            },
          ]}
        />
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Novo Ministério" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
