"use client";

import { createContext, useContext } from "react";
import type { Church } from "@/types/domain";

/**
 * A igreja da sessão, lida uma vez no layout do admin e distribuída daqui.
 *
 * Existe porque o nome da igreja aparece em quatro telas que são componentes
 * de cliente (`/admin/ministries`, `/admin/servants`, `/admin/settings`, a
 * barra lateral). Sem contexto, cada uma chamaria `getMyChurch()` por conta
 * própria: quatro idas ao banco para exibir a mesma palavra, cada uma podendo
 * ficar dessincronizada da outra depois de um rename.
 *
 * Não é cache: o valor vem do servidor a cada render do layout, então
 * `router.refresh()` depois de renomear já traz o nome novo.
 */
const ChurchContext = createContext<Church | null>(null);

export function ChurchProvider({ church, children }: { church: Church; children: React.ReactNode }) {
  return <ChurchContext.Provider value={church}>{children}</ChurchContext.Provider>;
}

/** A igreja da sessão. Lança fora do provider — é erro de montagem, não estado. */
export function useChurch(): Church {
  const church = useContext(ChurchContext);
  if (!church) throw new Error("useChurch precisa estar dentro de <ChurchProvider>");
  return church;
}
