/**
 * Tipos de domínio compartilhados entre server actions e componentes.
 *
 * Vivem fora de `src/lib/actions/` porque módulos `"use server"` devem
 * exportar apenas funções assíncronas: cada export lá vira um endpoint POST.
 */

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
  ministryId: number;
  ministryName: string;
  isCoordinator: boolean;
}

export interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  /** E.164 sem `+`. `null` quando a pessoa não informou — é opcional. */
  phone: string | null;
  email: string | null;
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
  ministry: { name: string };
  sector: { name: string };
  dates: { id: number; date: string; startTime: string }[];
}

export interface CalendarAssignee {
  servantId: number;
  name: string;
}

export interface CalendarDate {
  id: number;
  date: string;
  startTime: string;
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
  scheduleName: string;
  sectorName: string;
  ministryName: string;
  requesterName: string;
  createdAt: string;
}
