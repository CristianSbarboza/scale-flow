import "server-only";

import { db } from "@/db";
import { ministries, sectors, users, schedules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Scope } from "@/types/scope";
import type { AiPendingConfirmation } from "@/types/domain";
import type { AiToolDefinition } from "@/lib/ai/providers";
import {
  getMinistries,
  createMinistry,
  updateMinistryDetails,
  addMinistryLeader,
  removeMinistryLeader,
  deleteMinistry,
  setMinistryActive,
} from "@/lib/actions/ministries";
import {
  getSectors,
  createSector,
  updateSector,
  deleteSector,
  setSectorActive,
} from "@/lib/actions/sectors";
import {
  getServants,
  createServant,
  updateServantProfile,
  addServantToSector,
  removeServantFromSector,
  setServantCoordinator,
  setServantActive,
  deleteServantAccount,
} from "@/lib/actions/servants";
import {
  getSchedules,
  getScheduleResponses,
  getScheduleSectorServants,
  createSchedule,
  updateSchedule,
  publishSchedule,
  unpublishSchedule,
  duplicateSchedule,
  deleteSchedule,
} from "@/lib/actions/schedules";
import {
  getServantOverview,
  assignServant,
  removeAssignment,
  saveAvailability,
} from "@/lib/actions/availability";
import {
  getPendingSwapRequests,
  createSwapRequest,
  respondToSwapRequest,
} from "@/lib/actions/swaps";
import {
  getCoordinatorSectors,
  getCoordinatorSchedules,
} from "@/lib/actions/coordinator";
import { renameChurch } from "@/lib/actions/church";

/**
 * Ferramentas exclusivas de Servo/Membro (valem também para coordenadores,
 * líderes e admins caso sirvam em algum setor).
 */
const SERVANT_TOOLS: AiToolDefinition[] = [
  {
    name: "list_my_schedules",
    description:
      "Lista as escalas publicadas dos setores onde o usuário logado serve, com datas, horários, se está escalado (confirmed), se marcou disponibilidade (available) e quem mais está escalado.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "save_my_availability",
    description:
      "Salva/atualiza a disponibilidade do próprio usuário logado em uma escala publicada. Importante: informe TODOS os IDs de datas daquela escala em que o servo pode servir (substitui a marcação anterior dessa escala).",
    parameters: {
      type: "object",
      properties: {
        servantId: {
          type: "number",
          description: "ID do vínculo de servo (servantId retornado em list_my_schedules).",
        },
        scheduleId: {
          type: "number",
          description: "ID da escala (id retornado em list_my_schedules).",
        },
        dateIds: {
          type: "array",
          description: "Lista de IDs das datas (date.id) em que o servo tem disponibilidade.",
          items: { type: "number" },
        },
      },
      required: ["servantId", "scheduleId", "dateIds"],
    },
  },
  {
    name: "list_my_pending_swaps",
    description:
      "Lista os pedidos de troca de escala pendentes que outros servos enviaram para o usuário logado responder.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "request_swap",
    description:
      "Solicita troca de um dia de escala com outro servo confirmado do mesmo setor.",
    parameters: {
      type: "object",
      properties: {
        dateId: {
          type: "number",
          description: "ID da data da escala (date.id).",
        },
        targetServantId: {
          type: "number",
          description: "ID do servo alvo com quem deseja trocar (assignee.servantId).",
        },
        requesterServantId: {
          type: "number",
          description: "ID do próprio vínculo de servo solicitante (schedule.servantId).",
        },
      },
      required: ["dateId", "targetServantId", "requesterServantId"],
    },
  },
  {
    name: "respond_swap",
    description:
      "Aceita ou recusa um pedido de troca enviado ao usuário logado.",
    parameters: {
      type: "object",
      properties: {
        swapRequestId: {
          type: "number",
          description: "ID do pedido de troca pendente (retornado em list_my_pending_swaps).",
        },
        accept: {
          type: "boolean",
          description: "true para aceitar a troca, false para recusar.",
        },
      },
      required: ["swapRequestId", "accept"],
    },
  },
];

/**
 * Ferramentas de Gestão de Escalas (permitidas para Coordenador nos seus setores,
 * Líder nos seus ministérios e Admin na igreja inteira).
 */
const SCHEDULE_MANAGEMENT_TOOLS: AiToolDefinition[] = [
  {
    name: "list_managed_schedules",
    description:
      "Lista as escalas que o usuário gerencia (rascunhos e publicadas), com seus setores, ministérios e datas.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_schedule_details",
    description:
      "Consulta os detalhes de uma escala específica: lista de servos do setor, quem marcou disponibilidade e quem está escalado (confirmado) em cada data.",
    parameters: {
      type: "object",
      properties: {
        scheduleId: {
          type: "number",
          description: "ID da escala.",
        },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "create_schedule",
    description:
      "Cria uma única escala em rascunho para um setor, com datas (YYYY-MM-DD) e horários (HH:MM). IMPORTANTE: Crie APENAS UMA escala por turno (nunca chame create_schedule mais de uma vez na mesma resposta). Se o usuário pediu mais de uma escala, faça a confirmação e criação de uma por vez. Você pode informar sectorId OU sectorName (ex: 'Fotografia'). Não peça IDs ao usuário.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nome da escala (ex: Escala de Novembro - Fotografia).",
        },
        sectorId: {
          type: "number",
          description: "ID do setor (opcional se sectorName for informado).",
        },
        sectorName: {
          type: "string",
          description: "Nome do setor (ex: Fotografia, Transmissão).",
        },
        ministryId: {
          type: "number",
          description: "ID do ministério dono do setor (opcional; descoberto automaticamente pelo setor).",
        },
        dates: {
          type: "array",
          description: "Datas (YYYY-MM-DD), horários (HH:MM) e título opcional de cada culto/evento da escala.",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "Data no formato YYYY-MM-DD." },
              startTime: { type: "string", description: "Horário no formato HH:MM (ex: 10:00, 18:30, 19:30)." },
              title: {
                type: "string",
                description: "Título opcional da data (ex: 'Culto de Santa Ceia'). Omitir em cultos comuns.",
              },
            },
            required: ["date", "startTime"],
          },
        },
        visibility: {
          type: "string",
          description: "Visibilidade do link: public ou private.",
          enum: ["public", "private"],
        },
      },
      required: ["name", "dates"],
    },
  },
  {
    name: "update_schedule",
    description:
      "Atualiza o nome, o setor (sectorId ou sectorName), a visibilidade ou a lista completa de datas de uma escala existente.",
    parameters: {
      type: "object",
      properties: {
        scheduleId: {
          type: "number",
          description: "ID da escala.",
        },
        name: {
          type: "string",
          description: "Novo nome da escala.",
        },
        sectorId: {
          type: "number",
          description: "ID do novo setor (opcional, caso queira mover a escala de setor).",
        },
        sectorName: {
          type: "string",
          description: "Nome do novo setor (opcional, caso queira mover a escala de setor).",
        },
        dates: {
          type: "array",
          description: "Lista completa de datas (YYYY-MM-DD), horários (HH:MM) e títulos opcionais da escala.",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "Data YYYY-MM-DD." },
              startTime: { type: "string", description: "Horário HH:MM." },
              title: { type: "string", description: "Título opcional da data (ex: 'Culto de Santa Ceia')." },
            },
            required: ["date", "startTime"],
          },
        },
        visibility: {
          type: "string",
          description: "Visibilidade opcional (public ou private).",
          enum: ["public", "private"],
        },
      },
      required: ["scheduleId", "name", "dates"],
    },
  },
  {
    name: "publish_schedule",
    description:
      "Publica uma escala que estava em rascunho, liberando-a para os servos do setor.",
    parameters: {
      type: "object",
      properties: {
        scheduleId: { type: "number", description: "ID da escala." },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "unpublish_schedule",
    description:
      "Volta uma escala publicada para o estado de rascunho (draft).",
    parameters: {
      type: "object",
      properties: {
        scheduleId: { type: "number", description: "ID da escala." },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "duplicate_schedule",
    description:
      "Duplica uma escala existente criando uma cópia em rascunho com as mesmas datas (opcionalmente já mudando o nome e o setor de destino se o usuário coordenar/gerenciar mais de um setor).",
    parameters: {
      type: "object",
      properties: {
        scheduleId: { type: "number", description: "ID da escala original." },
        name: { type: "string", description: "Nome opcional para a nova cópia." },
        sectorName: { type: "string", description: "Nome opcional do setor de destino da cópia." },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "assign_servant_to_date",
    description:
      "Escala (confirma) um servo do setor em uma data específica da escala.",
    parameters: {
      type: "object",
      properties: {
        dateId: { type: "number", description: "ID da data da escala (dateId)." },
        servantId: { type: "number", description: "ID do vínculo de servo no setor (servantId)." },
      },
      required: ["dateId", "servantId"],
    },
  },
  {
    name: "remove_assignment_from_date",
    description:
      "Remove a escalação (assignmentId) de um servo em uma data da escala.",
    parameters: {
      type: "object",
      properties: {
        assignmentId: {
          type: "number",
          description: "ID da escalação (assignment.id retornado em get_schedule_details).",
        },
      },
      required: ["assignmentId"],
    },
  },
  {
    name: "delete_schedule",
    description:
      "Solicita a exclusão de uma escala. Esta ferramenta gera um pedido de confirmação na tela para o usuário aprovar.",
    parameters: {
      type: "object",
      properties: {
        scheduleId: { type: "number", description: "ID da escala a excluir." },
      },
      required: ["scheduleId"],
    },
  },
];

/**
 * Ferramentas de Gestão de Ministérios, Setores e Servos (permitidas para Líder
 * dentro dos seus ministérios e Admin na igreja inteira).
 */
const LEADER_AND_ADMIN_TOOLS: AiToolDefinition[] = [
  {
    name: "list_ministries",
    description:
      "Lista os ministérios visíveis ao usuário, com seus líderes, setores e quantidade de servos.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "add_ministry_leader",
    description:
      "Adiciona um líder a um ministério informando nome, e-mail e telefone opcional.",
    parameters: {
      type: "object",
      properties: {
        ministryId: { type: "number", description: "ID do ministério." },
        leaderName: { type: "string", description: "Nome completo do líder." },
        leaderEmail: { type: "string", description: "E-mail do líder." },
        leaderPhone: { type: "string", description: "Telefone opcional." },
      },
      required: ["ministryId", "leaderName", "leaderEmail"],
    },
  },
  {
    name: "remove_ministry_leader",
    description:
      "Remove um líder de um ministério (desde que não seja o único líder).",
    parameters: {
      type: "object",
      properties: {
        ministryId: { type: "number", description: "ID do ministério." },
        userId: { type: "string", description: "UUID do usuário líder (userId)." },
      },
      required: ["ministryId", "userId"],
    },
  },
  {
    name: "list_sectors",
    description:
      "Lista os setores visíveis ao usuário com seu ministério e servos vinculados.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_sector",
    description: "Cria um novo setor dentro de um ministério.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do setor." },
        ministryId: { type: "number", description: "ID do ministério." },
      },
      required: ["name", "ministryId"],
    },
  },
  {
    name: "update_sector",
    description: "Renomeia um setor existente.",
    parameters: {
      type: "object",
      properties: {
        sectorId: { type: "number", description: "ID do setor." },
        name: { type: "string", description: "Novo nome do setor." },
      },
      required: ["sectorId", "name"],
    },
  },
  {
    name: "delete_sector",
    description:
      "Solicita a exclusão de um setor. Gera um pedido de confirmação na tela para o usuário aprovar.",
    parameters: {
      type: "object",
      properties: {
        sectorId: { type: "number", description: "ID do setor a excluir." },
      },
      required: ["sectorId"],
    },
  },
  {
    name: "list_servants",
    description:
      "Lista todos os servos/membros visíveis ao usuário com usuário de login, e-mail, telefone e setores em que servem.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_servant",
    description:
      "Cadastra um novo servo em um setor (ou vincula caso já exista), retornando a senha inicial gerada se a conta for nova.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do servo." },
        username: { type: "string", description: "Nome de usuário para login (sem espaços)." },
        sectorId: { type: "number", description: "ID do setor inicial." },
        email: { type: "string", description: "E-mail opcional." },
        phone: { type: "string", description: "Telefone opcional." },
      },
      required: ["name", "username", "sectorId"],
    },
  },
  {
    name: "update_servant_profile",
    description:
      "Atualiza o nome, telefone ou e-mail de um servo cadastrado.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "UUID do usuário do servo (userId)." },
        name: { type: "string", description: "Nome atualizado." },
        phone: { type: "string", description: "Telefone atualizado (ou vazio)." },
        email: { type: "string", description: "E-mail atualizado (ou vazio)." },
      },
      required: ["userId", "name"],
    },
  },
  {
    name: "add_servant_to_sector",
    description: "Adiciona um servo já cadastrado a mais um setor.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "UUID do usuário do servo (userId)." },
        sectorId: { type: "number", description: "ID do setor." },
      },
      required: ["userId", "sectorId"],
    },
  },
  {
    name: "remove_servant_from_sector",
    description: "Remove o vínculo de um servo com um setor específico (servantId).",
    parameters: {
      type: "object",
      properties: {
        servantId: {
          type: "number",
          description: "ID do vínculo na tabela servants (membership.servantId).",
        },
      },
      required: ["servantId"],
    },
  },
  {
    name: "set_servant_coordinator",
    description:
      "Define ou remove um servo como coordenador de um setor específico.",
    parameters: {
      type: "object",
      properties: {
        servantId: {
          type: "number",
          description: "ID do vínculo na tabela servants (membership.servantId).",
        },
        isCoordinator: {
          type: "boolean",
          description: "true para tornar coordenador do setor, false para remover coordenação.",
        },
      },
      required: ["servantId", "isCoordinator"],
    },
  },
  {
    name: "set_ministry_active",
    description:
      "Ativa ou desativa um ministério sem excluir seus dados.",
    parameters: {
      type: "object",
      properties: {
        ministryId: { type: "number", description: "ID do ministério." },
        isActive: { type: "boolean", description: "true para ativar, false para desativar." },
      },
      required: ["ministryId", "isActive"],
    },
  },
  {
    name: "set_sector_active",
    description:
      "Ativa ou desativa um setor sem excluir seus dados.",
    parameters: {
      type: "object",
      properties: {
        sectorId: { type: "number", description: "ID do setor." },
        isActive: { type: "boolean", description: "true para ativar, false para desativar." },
      },
      required: ["sectorId", "isActive"],
    },
  },
  {
    name: "set_servant_active",
    description:
      "Ativa ou desativa o cadastro de um servo sem excluir seus dados (enquanto desativado, não recebe WhatsApp e não preenche escalas).",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "UUID do usuário do servo (userId)." },
        isActive: { type: "boolean", description: "true para ativar, false para desativar." },
      },
      required: ["userId", "isActive"],
    },
  },
  {
    name: "delete_servant_account",
    description:
      "Solicita a exclusão completa da conta de um servo. Gera um pedido de confirmação na tela para o usuário aprovar.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "UUID do usuário (userId) a excluir." },
      },
      required: ["userId"],
    },
  },
];

/**
 * Ferramentas exclusivas do Administrador da igreja.
 */
const ADMIN_ONLY_TOOLS: AiToolDefinition[] = [
  {
    name: "create_ministry",
    description:
      "Cria um novo ministério na igreja e vincula seu primeiro líder por nome e e-mail.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do ministério." },
        description: { type: "string", description: "Descrição do ministério." },
        leaderName: { type: "string", description: "Nome do líder inicial." },
        leaderEmail: { type: "string", description: "E-mail do líder inicial." },
        leaderPhone: { type: "string", description: "Telefone opcional do líder." },
      },
      required: ["name", "leaderName", "leaderEmail"],
    },
  },
  {
    name: "update_ministry_details",
    description: "Atualiza o nome e a descrição de um ministério.",
    parameters: {
      type: "object",
      properties: {
        ministryId: { type: "number", description: "ID do ministério." },
        name: { type: "string", description: "Novo nome do ministério." },
        description: { type: "string", description: "Nova descrição." },
      },
      required: ["ministryId", "name"],
    },
  },
  {
    name: "delete_ministry",
    description:
      "Solicita a exclusão de um ministério inteiro. Gera um pedido de confirmação na tela para o administrador aprovar.",
    parameters: {
      type: "object",
      properties: {
        ministryId: { type: "number", description: "ID do ministério a excluir." },
      },
      required: ["ministryId"],
    },
  },
  {
    name: "rename_church",
    description: "Atualiza o nome de exibição da igreja.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Novo nome de exibição da igreja." },
      },
      required: ["name"],
    },
  },
];

/**
 * Retorna apenas as definições de ferramentas permitidas para o escopo atual.
 * Defesa em profundidade: o LLM nem sequer conhece ferramentas fora do papel do usuário.
 */
export function getToolsForScope(scope: Scope): AiToolDefinition[] {
  if (scope.role === "admin") {
    return [
      ...ADMIN_ONLY_TOOLS,
      ...LEADER_AND_ADMIN_TOOLS,
      ...SCHEDULE_MANAGEMENT_TOOLS,
      ...SERVANT_TOOLS,
    ];
  }
  if (scope.role === "leader") {
    return [
      ...LEADER_AND_ADMIN_TOOLS,
      ...SCHEDULE_MANAGEMENT_TOOLS,
      ...SERVANT_TOOLS,
    ];
  }
  if (scope.coordinatedSectorIds.length > 0) {
    return [...SCHEDULE_MANAGEMENT_TOOLS, ...SERVANT_TOOLS];
  }
  return [...SERVANT_TOOLS];
}

export interface ToolExecutionOutcome {
  output: unknown;
  pendingConfirmation?: AiPendingConfirmation;
}

function normalizeMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Converte entradas como "10", "10h", "10h30", "18:30", "9:00" para "HH:MM".
 */
function normalizeTimeString(raw: unknown): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "19:00";

  const match = s.match(/^(\d{1,2})(?:[:h](\d{2}))?h?$/);
  if (match) {
    const hh = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, "0");
    const mm = match[2] ? String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, "0") : "00";
    return `${hh}:${mm}`;
  }

  if (/^\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 5);
  }
  return "19:00";
}

/**
 * Resolve um setor pelo ID ou pelo nome (ignorando acentos e maiúsculas/minúsculas)
 * dentro da igreja do escopo atual.
 */
async function resolveSectorForScope(
  scope: Scope,
  sectorIdArg: unknown,
  sectorNameArg: unknown,
): Promise<{ id: number; name: string; ministryId: number }> {
  const allChurchSectors = await db
    .select({
      id: sectors.id,
      name: sectors.name,
      ministryId: sectors.ministryId,
    })
    .from(sectors)
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(eq(ministries.churchId, scope.churchId));

  const numId = Number(sectorIdArg);
  if (!Number.isNaN(numId) && numId > 0) {
    const byId = allChurchSectors.find((s) => s.id === numId);
    if (byId) return byId;
  }

  const targetName = normalizeMatch(String(sectorNameArg ?? ""));
  if (targetName) {
    const exact = allChurchSectors.find((s) => normalizeMatch(s.name) === targetName);
    if (exact) return exact;

    const partial = allChurchSectors.find(
      (s) =>
        normalizeMatch(s.name).includes(targetName) ||
        targetName.includes(normalizeMatch(s.name)),
    );
    if (partial) return partial;
  }

  const disponiveis = allChurchSectors.map((s) => s.name).join(", ");
  throw new Error(
    disponiveis
      ? `Setor "${sectorNameArg || sectorIdArg}" não encontrado. Setores disponíveis: ${disponiveis}.`
      : "Nenhum setor encontrado na igreja.",
  );
}

/**
 * Executa uma ferramenta verificando:
 * 1. Se a ferramenta pertence ao conjunto permitido para `scope`.
 * 2. Se é uma ferramenta destrutiva (`delete_*`), interceptando-a e gerando `pendingConfirmation`
 *    sem apagar nada no banco até que o humano clique no botão de confirmação na UI.
 * 3. As próprias Server Actions de domínio, que revalidam `churchId` e escopo no banco.
 */
export async function executeScopedTool(
  scope: Scope,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionOutcome> {
  const allowedTools = getToolsForScope(scope);
  if (!allowedTools.some((t) => t.name === toolName)) {
    throw new Error("Você não tem permissão para executar esta operação.");
  }

  switch (toolName) {
    // --- SERVANT TOOLS ---
    case "list_my_schedules": {
      const schedules = await getServantOverview();
      return { output: schedules };
    }
    case "save_my_availability": {
      const servantId = Number(args.servantId);
      const scheduleId = Number(args.scheduleId);
      const rawDates = Array.isArray(args.dateIds) ? args.dateIds : [];
      const dateIds = rawDates.map((d) => Number(d)).filter((n) => !Number.isNaN(n));
      await saveAvailability(servantId, scheduleId, dateIds);
      return { output: { success: true, message: "Disponibilidade salva com sucesso." } };
    }
    case "list_my_pending_swaps": {
      const swaps = await getPendingSwapRequests();
      return { output: swaps };
    }
    case "request_swap": {
      await createSwapRequest(
        Number(args.dateId),
        Number(args.targetServantId),
        Number(args.requesterServantId),
      );
      return { output: { success: true, message: "Pedido de troca enviado." } };
    }
    case "respond_swap": {
      const accept = Boolean(args.accept);
      await respondToSwapRequest(Number(args.swapRequestId), accept);
      return {
        output: {
          success: true,
          message: accept ? "Troca aceita com sucesso." : "Pedido de troca recusado.",
        },
      };
    }

    // --- SCHEDULE MANAGEMENT TOOLS (Coordinator, Leader, Admin) ---
    case "list_managed_schedules": {
      if (scope.role === "admin" || scope.role === "leader") {
        const list = await getSchedules();
        return {
          output: list.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            visibility: s.visibility,
            ministryId: s.ministry.id,
            ministryName: s.ministry.name,
            sectorId: s.sector.id,
            sectorName: s.sector.name,
            datesCount: s.dates.length,
            dates: s.dates.map((d) => ({
              id: d.id,
              date: d.date,
              startTime: d.startTime.slice(0, 5),
            })),
          })),
        };
      }
      const coordSectors = await getCoordinatorSectors();
      const coordSchedules = await getCoordinatorSchedules();
      return {
        output: {
          coordinatedSectors: coordSectors,
          schedules: coordSchedules,
        },
      };
    }
    case "get_schedule_details": {
      const scheduleId = Number(args.scheduleId);
      const [responses, sectorServants] = await Promise.all([
        getScheduleResponses(scheduleId),
        getScheduleSectorServants(scheduleId),
      ]);
      return {
        output: {
          scheduleId,
          sectorServants,
          dates: responses.map((d) => ({
            dateId: d.id,
            date: d.date,
            startTime: d.startTime.slice(0, 5),
            availableServants: d.availabilities.map((a) => ({
              servantId: a.servantId,
              name: a.servant.user.name,
            })),
            assignedServants: d.assignments.map((a) => ({
              assignmentId: a.id,
              servantId: a.servantId,
              name: a.servant.user.name,
            })),
          })),
        },
      };
    }
    case "create_schedule": {
      const resolvedSector = await resolveSectorForScope(
        scope,
        args.sectorId,
        args.sectorName ?? args.name,
      );
      const name = String(args.name ?? `Escala - ${resolvedSector.name}`).trim();
      const visibility = args.visibility === "private" ? "private" : "public";
      const rawDates = Array.isArray(args.dates) ? args.dates : [];
      const dates = rawDates.map((d: Record<string, unknown>) => ({
        date: String(d.date ?? "").slice(0, 10),
        startTime: normalizeTimeString(d.startTime),
        title: typeof d.title === "string" ? d.title : null,
      }));
      const res = await createSchedule(
        name,
        resolvedSector.ministryId,
        resolvedSector.id,
        dates,
        visibility,
      );
      return {
        output: {
          success: true,
          sectorName: resolvedSector.name,
          shareLink: res.shareLink,
          message: `Escala "${name}" criada em rascunho no setor ${resolvedSector.name} com ${dates.length} horário(s).`,
        },
      };
    }
    case "update_schedule": {
      const scheduleId = Number(args.scheduleId);
      const name = String(args.name ?? "").trim();
      const visibility =
        args.visibility === "private" || args.visibility === "public"
          ? args.visibility
          : undefined;
      const rawDates = Array.isArray(args.dates) ? args.dates : [];
      const dates = rawDates.map((d: Record<string, unknown>) => ({
        date: String(d.date ?? "").slice(0, 10),
        startTime: normalizeTimeString(d.startTime),
        title: typeof d.title === "string" ? d.title : null,
      }));

      let destino: { ministryId: number; sectorId: number } | undefined;
      if (args.sectorId !== undefined || args.sectorName !== undefined) {
        const resolved = await resolveSectorForScope(
          scope,
          args.sectorId,
          args.sectorName,
        );
        destino = { ministryId: resolved.ministryId, sectorId: resolved.id };
      }

      await updateSchedule(scheduleId, name, dates, visibility, destino);
      return { output: { success: true, message: `Escala "${name}" atualizada.` } };
    }
    case "publish_schedule": {
      const scheduleId = Number(args.scheduleId);
      await publishSchedule(scheduleId);
      return { output: { success: true, message: "Escala publicada com sucesso." } };
    }
    case "unpublish_schedule": {
      const scheduleId = Number(args.scheduleId);
      await unpublishSchedule(scheduleId);
      return { output: { success: true, message: "Escala retornada para rascunho." } };
    }
    case "duplicate_schedule": {
      const scheduleId = Number(args.scheduleId);
      const res = await duplicateSchedule(scheduleId);

      if (args.sectorName || args.name) {
        const copied = await db.query.schedules.findFirst({
          where: eq(schedules.id, res.id),
          with: { dates: true },
        });
        if (copied) {
          let destino: { ministryId: number; sectorId: number } | undefined;
          if (args.sectorName) {
            const resolved = await resolveSectorForScope(scope, undefined, args.sectorName);
            destino = { ministryId: resolved.ministryId, sectorId: resolved.id };
          }
          const newName =
            typeof args.name === "string" && args.name.trim()
              ? args.name.trim()
              : copied.name;
          await updateSchedule(
            res.id,
            newName,
            copied.dates.map((d) => ({ date: d.date, startTime: d.startTime, title: d.title })),
            copied.visibility,
            destino,
          );
        }
      }

      return {
        output: {
          success: true,
          newScheduleId: res.id,
          message: "Escala duplicada em rascunho com sucesso.",
        },
      };
    }
    case "assign_servant_to_date": {
      await assignServant(Number(args.dateId), Number(args.servantId));
      return { output: { success: true, message: "Servo escalado na data." } };
    }
    case "remove_assignment_from_date": {
      await removeAssignment(Number(args.assignmentId));
      return { output: { success: true, message: "Escalação removida da data." } };
    }
    case "delete_schedule": {
      const scheduleId = Number(args.scheduleId);
      const [row] = await db
        .select({ name: schedules.name })
        .from(schedules)
        .where(eq(schedules.id, scheduleId));
      const label = row ? `a escala "${row.name}" (#${scheduleId})` : `a escala #${scheduleId}`;
      const pendingConfirmation: AiPendingConfirmation = {
        toolName: "delete_schedule",
        args: { scheduleId },
        summary: `Excluir permanentemente ${label} e todas as suas datas e escalações.`,
      };
      return {
        output: {
          requiresConfirmation: true,
          message:
            "Ação aguardando confirmação do usuário no botão da tela. Avise o usuário para confirmar no botão abaixo.",
        },
        pendingConfirmation,
      };
    }

    // --- LEADER & ADMIN TOOLS ---
    case "list_ministries": {
      const list = await getMinistries();
      return {
        output: list.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          leaders: m.leaders.map((l) => ({
            userId: l.user.id,
            name: l.user.name,
            email: l.user.email,
          })),
          sectors: m.sectors.map((s) => ({
            id: s.id,
            name: s.name,
            servantsCount: s.servants.length,
          })),
        })),
      };
    }
    case "add_ministry_leader": {
      const res = await addMinistryLeader(
        Number(args.ministryId),
        String(args.leaderName ?? ""),
        String(args.leaderEmail ?? ""),
        args.leaderPhone ? String(args.leaderPhone) : null,
      );
      return {
        output: {
          success: true,
          generatedPassword: res.password,
          unchanged: res.unchanged,
        },
      };
    }
    case "remove_ministry_leader": {
      await removeMinistryLeader(Number(args.ministryId), String(args.userId ?? ""));
      return { output: { success: true, message: "Líder removido do ministério." } };
    }
    case "set_ministry_active": {
      const isActive = Boolean(args.isActive);
      await setMinistryActive(Number(args.ministryId), isActive);
      return {
        output: {
          success: true,
          message: isActive ? "Ministério ativado com sucesso." : "Ministério desativado com sucesso.",
        },
      };
    }
    case "set_sector_active": {
      const isActive = Boolean(args.isActive);
      await setSectorActive(Number(args.sectorId), isActive);
      return {
        output: {
          success: true,
          message: isActive ? "Setor ativado com sucesso." : "Setor desativado com sucesso.",
        },
      };
    }
    case "set_servant_active": {
      const isActive = Boolean(args.isActive);
      await setServantActive(String(args.userId ?? ""), isActive);
      return {
        output: {
          success: true,
          message: isActive ? "Servo ativado com sucesso." : "Servo desativado com sucesso.",
        },
      };
    }
    case "list_sectors": {
      const list = await getSectors();
      return {
        output: list.map((s) => ({
          id: s.id,
          name: s.name,
          ministryId: s.ministryId,
          ministryName: s.ministry.name,
          servants: s.servants.map((srv) => ({
            servantId: srv.id,
            userId: srv.user.id,
            name: srv.user.name,
            isCoordinator: srv.isCoordinator,
          })),
        })),
      };
    }
    case "create_sector": {
      const name = String(args.name ?? "").trim();
      const ministryId = Number(args.ministryId);
      await createSector(name, ministryId);
      return { output: { success: true, message: `Setor "${name}" criado.` } };
    }
    case "update_sector": {
      const sectorId = Number(args.sectorId);
      const name = String(args.name ?? "").trim();
      await updateSector(sectorId, name);
      return { output: { success: true, message: `Setor renomeado para "${name}".` } };
    }
    case "delete_sector": {
      const sectorId = Number(args.sectorId);
      const [row] = await db
        .select({ name: sectors.name })
        .from(sectors)
        .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
        .where(and(eq(sectors.id, sectorId), eq(ministries.churchId, scope.churchId)));
      const label = row ? `o setor "${row.name}" (#${sectorId})` : `o setor #${sectorId}`;
      const pendingConfirmation: AiPendingConfirmation = {
        toolName: "delete_sector",
        args: { sectorId },
        summary: `Excluir ${label}, incluindo seus vínculos e escalas.`,
      };
      return {
        output: {
          requiresConfirmation: true,
          message:
            "Ação aguardando confirmação do usuário no botão da tela. Avise o usuário para confirmar no botão abaixo.",
        },
        pendingConfirmation,
      };
    }
    case "list_servants": {
      const list = await getServants();
      return { output: list };
    }
    case "create_servant": {
      const name = String(args.name ?? "").trim();
      const username = String(args.username ?? "").trim();
      const sectorId = Number(args.sectorId);
      const email = args.email ? String(args.email) : null;
      const phone = args.phone ? String(args.phone) : null;
      const res = await createServant(name, username, email, sectorId, phone);
      return {
        output: {
          success: true,
          generatedPassword: res.password,
          message: res.password
            ? `Servo "${name}" criado! Senha provisória: ${res.password}`
            : `Servo "${name}" vinculado ao setor.`,
        },
      };
    }
    case "update_servant_profile": {
      await updateServantProfile(
        String(args.userId ?? ""),
        String(args.name ?? ""),
        args.phone ? String(args.phone) : null,
        args.email ? String(args.email) : null,
      );
      return { output: { success: true, message: "Dados do servo atualizados." } };
    }
    case "add_servant_to_sector": {
      await addServantToSector(String(args.userId ?? ""), Number(args.sectorId));
      return { output: { success: true, message: "Servo vinculado ao setor." } };
    }
    case "remove_servant_from_sector": {
      await removeServantFromSector(Number(args.servantId));
      return { output: { success: true, message: "Servo removido do setor." } };
    }
    case "set_servant_coordinator": {
      const isCoord = Boolean(args.isCoordinator);
      await setServantCoordinator(Number(args.servantId), isCoord);
      return {
        output: {
          success: true,
          message: isCoord
            ? "Servo definido como coordenador do setor."
            : "Coordenação removida do servo.",
        },
      };
    }
    case "delete_servant_account": {
      const userId = String(args.userId ?? "");
      const [row] = await db
        .select({ name: users.name })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.churchId, scope.churchId)));
      const label = row ? `a conta de "${row.name}"` : `a conta selecionada`;
      const pendingConfirmation: AiPendingConfirmation = {
        toolName: "delete_servant_account",
        args: { userId },
        summary: `Excluir permanentemente ${label} de todos os setores da igreja.`,
      };
      return {
        output: {
          requiresConfirmation: true,
          message:
            "Ação aguardando confirmação do usuário no botão da tela. Avise o usuário para confirmar no botão abaixo.",
        },
        pendingConfirmation,
      };
    }

    // --- ADMIN ONLY TOOLS ---
    case "create_ministry": {
      const name = String(args.name ?? "").trim();
      const description = String(args.description ?? "").trim();
      const leaderName = String(args.leaderName ?? "").trim();
      const leaderEmail = String(args.leaderEmail ?? "").trim();
      const leaderPhone = args.leaderPhone ? String(args.leaderPhone) : null;
      const res = await createMinistry(name, description, leaderName, leaderEmail, leaderPhone);
      return {
        output: {
          success: true,
          generatedPassword: res.password,
          message: res.password
            ? `Ministério "${name}" criado! Senha provisória do líder: ${res.password}`
            : `Ministério "${name}" criado com sucesso.`,
        },
      };
    }
    case "update_ministry_details": {
      await updateMinistryDetails(
        Number(args.ministryId),
        String(args.name ?? ""),
        String(args.description ?? ""),
      );
      return { output: { success: true, message: "Ministério atualizado." } };
    }
    case "delete_ministry": {
      const ministryId = Number(args.ministryId);
      const [row] = await db
        .select({ name: ministries.name })
        .from(ministries)
        .where(and(eq(ministries.id, ministryId), eq(ministries.churchId, scope.churchId)));
      const label = row ? `o ministério "${row.name}" (#${ministryId})` : `o ministério #${ministryId}`;
      const pendingConfirmation: AiPendingConfirmation = {
        toolName: "delete_ministry",
        args: { ministryId },
        summary: `Excluir permanentemente ${label}, seus setores e escalas.`,
      };
      return {
        output: {
          requiresConfirmation: true,
          message:
            "Ação aguardando confirmação do usuário no botão da tela. Avise o usuário para confirmar no botão abaixo.",
        },
        pendingConfirmation,
      };
    }
    case "rename_church": {
      const updated = await renameChurch(String(args.name ?? ""));
      return {
        output: {
          success: true,
          name: updated.name,
          message: `Nome da igreja atualizado para "${updated.name}".`,
        },
      };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${toolName}`);
  }
}

/**
 * Executa de fato uma exclusão após o clique explícito do usuário no card de confirmação.
 * As funções de domínio revalidam todas as permissões (`requireAdmin`, `requireSectorAccess`, etc.).
 */
export async function executeConfirmedDeletion(
  scope: Scope,
  confirmation: AiPendingConfirmation,
): Promise<string> {
  const allowedTools = getToolsForScope(scope);
  if (!allowedTools.some((t) => t.name === confirmation.toolName)) {
    throw new Error("Você não tem permissão para confirmar esta exclusão.");
  }

  switch (confirmation.toolName) {
    case "delete_ministry": {
      const ministryId = Number(confirmation.args.ministryId);
      await deleteMinistry(ministryId);
      return "Ministério excluído com sucesso.";
    }
    case "delete_sector": {
      const sectorId = Number(confirmation.args.sectorId);
      await deleteSector(sectorId);
      return "Setor excluído com sucesso.";
    }
    case "delete_servant_account": {
      const userId = String(confirmation.args.userId ?? "");
      await deleteServantAccount(userId);
      return "Conta do servo excluída com sucesso.";
    }
    case "delete_schedule": {
      const scheduleId = Number(confirmation.args.scheduleId);
      await deleteSchedule(scheduleId);
      return "Escala excluída com sucesso.";
    }
    default:
      throw new Error("Operação de exclusão inválida.");
  }
}

