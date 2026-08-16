"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createServant, getServants } from "@/lib/actions/servants";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { UserPlus, Plus } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import GeneratedPassword from "@/components/ui/GeneratedPassword";
import Field from "@/components/ui/Field";
import SelectField from "@/components/ui/SelectField";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

interface Membership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
}

interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: Membership[];
}

interface Sector {
  id: number;
  name: string;
  ministryId: number;
  ministry: { id: number; name: string };
}

interface Ministry {
  id: number;
  name: string;
}

export default function ServantsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isLeader = session?.user.role === "leader";
  const [servants, setServants] = useState<ServantSummary[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [sectorId, setSectorId] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    let isMounted = true;
    const load = async () => {
      try {
        const srv = await getServants();
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
          setServants(srv as unknown as ServantSummary[]);
          setSectors(sec as unknown as Sector[]);
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
    const result = await createServant(name, username, email || null, parseInt(sectorId));
    setGeneratedPassword(result.password || "");
    setName("");
    setUsername("");
    setEmail("");
    setSectorId("");

    // Refresh list
    const srv = await getServants();
    setServants(srv as unknown as ServantSummary[]);
    
    setLoading(false);
  };


  const filteredServants = servants.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                          (s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesMinistry = filterMinistryId === "all" || s.memberships.some(m => m.ministryId === parseInt(filterMinistryId));
    const matchesSector = filterSectorId === "all" || s.memberships.some(m => m.sectorId === parseInt(filterSectorId));
    return matchesSearch && matchesMinistry && matchesSector;
  });

  const formContent = (
    <>
      <form onSubmit={handleCreate} className="grid gap-6">
        <Field
          label="Nome Completo"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <Field
          label="Usuário"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Ex: joao.silva"
          required
        />
        <Field
          label="E-mail (opcional)"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <SelectField
          label="Setor Principal"
          value={sectorId}
          onChange={e => setSectorId(e.target.value)}
          placeholder="Selecione um setor"
          options={sectors.map(sec => ({ value: sec.id, label: `${sec.ministry.name} - ${sec.name}` }))}
          required
        />
        <Button type="submit" disabled={loading}>
          <UserPlus size={18} />
          {loading ? "Cadastrando..." : "Cadastrar Servo"}
        </Button>
      </form>

      {generatedPassword && (
        <GeneratedPassword
          password={generatedPassword}
          title="Senha de Primeiro Acesso"
          description="Passe esta senha ao servo. Ele poderá alterá-la após o login."
        />
      )}
    </>
  );

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Gestão de Servos</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Cadastre e gerencie os voluntários da sua igreja.</p>
      </header>

      <div className="admin-panel-layout">
        {/* Form */}
        <FormPanel title="Cadastrar Novo Servo">{formContent}</FormPanel>

        {/* List */}
        <DataPanel
          title="Servos Cadastrados"
          stackToolbar
          toolbar={
            <>
              {!isLeader && (
                <FilterSelect
                  label="Filtrar por ministério"
                  value={filterMinistryId}
                  onChange={(v) => {
                    setFilterMinistryId(v);
                    setFilterSectorId("all"); // troca de ministério zera o setor
                  }}
                  options={[
                    { value: "all", label: "Todos Ministérios" },
                    ...ministries.map((m) => ({ value: String(m.id), label: m.name })),
                  ]}
                />
              )}
              <FilterSelect
                label="Filtrar por setor"
                value={filterSectorId}
                onChange={setFilterSectorId}
                options={[
                  { value: "all", label: "Todos Setores" },
                  ...sectors
                    .filter((sec) => filterMinistryId === "all" || sec.ministryId === parseInt(filterMinistryId))
                    .map((sec) => ({ value: String(sec.id), label: sec.name })),
                ]}
              />
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar nome, usuário ou e-mail..."
              />
            </>
          }
          rows={filteredServants}
          rowKey={(s) => s.userId}
          onRowClick={(s) => router.push(`/admin/servants/${s.userId}`)}
          empty="Nenhum servo encontrado para os filtros selecionados."
          columns={[
            { header: "Nome", primary: true, cell: (s) => s.name },
            {
              header: "Usuário/E-mail",
              cell: (s) => <span className="text-muted-foreground">{s.username || s.email || "-"}</span>,
            },
            {
              header: "Setores",
              cell: (s) => (
                <div className="flex flex-wrap gap-1.5">
                  {s.memberships.map((m) => (
                    <span key={m.servantId} className="rounded-full bg-muted px-2 py-1 text-xs">
                      {m.sectorName}
                    </span>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Cadastrar Novo Servo" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
