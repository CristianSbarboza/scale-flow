/**
 * Tipos de domínio compartilhados entre server actions e componentes.
 *
 * Vivem fora de `src/lib/actions/` porque módulos `"use server"` devem
 * exportar apenas funções assíncronas: cada export lá vira um endpoint POST.
 */

/** Uma data como os formulários de escala a enviam. `title` é opcional. */
export interface ScheduleDateInput {
  date: string;
  startTime: string;
  title?: string | null;
}

export interface Church {
  id: number;
  name: string;
  /** O que o servo digita no login antes do próprio usuário. Nunca muda pela UI. */
  username: string;
}

export interface ServantMembership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  sectorIsActive: boolean;
  ministryId: number;
  ministryName: string;
  ministryIsActive: boolean;
  isCoordinator: boolean;
  isActive: boolean;
}

export interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  /** E.164 sem `+`. `null` quando a pessoa não informou — é opcional. */
  phone: string | null;
  email: string | null;
  isActive: boolean;
  memberships: ServantMembership[];
}

/**
 * Um servo do setor, para o seletor de escalação manual.
 *
 * É a lista inteira do setor, e não só quem respondeu: o ponto do seletor é
 * justamente escalar quem não conseguiu informar disponibilidade a tempo.
 * Quem respondeu já sai marcado na tela, cruzando com as disponibilidades da
 * data.
 */
export interface SectorServantOption {
  servantId: number;
  name: string;
}

export interface ServantOverviewAssignee {
  servantId: number;
  userId: string;
  name: string;
  isSelf: boolean;
  color: string | null;
}

export interface ServantOverviewDate {
  id: number;
  date: string;
  startTime: string;
  title: string | null;
  confirmed: boolean;
  available: boolean;
  assignees: ServantOverviewAssignee[];
}

export interface ServantOverviewSchedule {
  id: number;
  name: string;
  ministryName: string;
  sectorName: string;
  shareLink: string;
  servantId: number;
  dates: ServantOverviewDate[];
}

export interface CoordinatorSector {
  id: number;
  name: string;
  ministryId: number;
  ministryName: string;
}

export interface CoordinatorSchedule {
  id: number;
  name: string;
  status: "draft" | "published";
  visibility: "public" | "private";
  shareLink: string;
  ministryId: number;
  sectorId: number;
  ministry: { name: string };
  sector: { name: string };
  dates: { id: number; date: string; startTime: string; title: string | null }[];
}

export interface CalendarAssignee {
  servantId: number;
  name: string;
}

export interface CalendarDate {
  id: number;
  date: string;
  startTime: string;
  title: string | null;
  assignees: CalendarAssignee[];
}

export interface CalendarSchedule {
  id: number;
  name: string;
  ministryId: number;
  ministryName: string;
  sectorId: number;
  sectorName: string;
  dates: CalendarDate[];
}

export interface PendingSwapRequest {
  id: number;
  dateId: number;
  date: string;
  startTime: string;
  title: string | null;
  scheduleName: string;
  sectorName: string;
  ministryName: string;
  requesterName: string;
  createdAt: string;
}

export type AiProviderId = "gemini" | "claude" | "openai" | "grok" | "groq" | "openrouter";

export type AiPersonalityStyle = "warm" | "balanced" | "direct";

export interface AiUserSettingsView {
  /** Nome personalizado pelo usuário (`null` = usa o padrão da igreja). */
  userAiName: string | null;
  /** Estilo personalizado pelo usuário (`null` = usa o padrão da igreja). */
  userAiStyle: AiPersonalityStyle | null;
  /** Nome padrão definido pela igreja (para exibir como placeholder). */
  churchDefaultName: string;
  /** Estilo padrão definido pela igreja. */
  churchDefaultStyle: AiPersonalityStyle;
  /** Nome efetivo que a assistente usará na conversa. */
  effectiveName: string;
  /** Estilo efetivo que a assistente usará na conversa. */
  effectiveStyle: AiPersonalityStyle;
  /** Se a igreja já possui chave de API configurada (para habilitar o chat). */
  isConfigured: boolean;
}

export interface AiChurchAdminSettingsView {
  provider: AiProviderId;
  model: string | null;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  defaultName: string;
  defaultStyle: AiPersonalityStyle;
}

export interface AiPendingConfirmation {
  toolName: "delete_ministry" | "delete_sector" | "delete_servant_account" | "delete_schedule";
  args: Record<string, unknown>;
  summary: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  pendingConfirmation?: AiPendingConfirmation;
}

