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
import PhoneField from "@/components/ui/PhoneField";
import SelectField from "@/components/ui/SelectField";
import FilterSelect from "@/components/ui/FilterSelect";
import PageHeader from "@/components/ui/PageHeader";
import { useChurch } from "@/components/ChurchContext";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useAdminTopbar } from "@/components/AdminTopbarContext";
import { useToast } from "@/components/Toast";

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
  const church = useChurch();
  const { showToast } = useToast();
  const isLeader = session?.user.role === "leader";
  const [servants, setServants] = useState<ServantSummary[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [sectorId, setSectorId] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
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
      } finally {
        setLoadingList(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createServant(name, username, email || null, parseInt(sectorId), phone);
      setGeneratedPassword(result.password || "");
      setName("");
      setUsername("");
      setEmail("");
      setPhone(null);
      setSectorId("");

      // Refresh list
      const srv = await getServants();
      setServants(srv as unknown as ServantSummary[]);
    } catch (error) {
      // Sem isto, um e-mail já usado em outra igreja deixava o botão preso em
      // "Cadastrando..." para sempre, sem dizer nada.
      showToast(error instanceof Error ? error.message : "Erro ao cadastrar servo.", "error");
    } finally {
      setLoading(false);
    }
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
          hint="Se informado, o servo também poderá entrar com ele."
        />
        <PhoneField
          label="Telefone (opcional)"
          value={phone}
          onChange={setPhone}
        />
        <SelectField
          label="Setor Principal"
          value={sectorId}
          onChange={setSectorId}
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
      <PageHeader title="Gestão de Servos" subtitle={`Cadastre e gerencie os voluntários de ${church.name}.`} />

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
          loading={loadingList}
          rowKey={(s) => s.userId}
          onRowClick={(s) => router.push(`/admin/servants/${s.userId}`)}
          empty="Nenhum servo encontrado para os filtros selecionados."
          columns={[
            { header: "Nome", primary: true, cell: (s) => s.name },
            {
              header: "Usuário/E-mail",
              cell: (s) => s.username || s.email || "-",
            },
            {
              header: "Setores",
              cell: (s) => s.memberships.map((m) => m.sectorName).join(", "),
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
