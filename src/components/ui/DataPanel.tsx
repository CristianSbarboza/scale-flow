"use client";

import Panel from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

export interface Column<T> {
  /** Nome da coluna: vira o <th> no desktop e o rótulo do campo no celular. */
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Coluna principal: no celular vira o título do card, sem rótulo. */
  primary?: boolean;
  align?: "left" | "right";
  /** Esconde a coluna no celular, para dados que só fazem sentido na tabela. */
  hideOnMobile?: boolean;
}

/**
 * Painel de listagem do admin: título, barra de busca e filtros, e os dados
 * em tabela no desktop ou em cards no celular.
 *
 * As quatro telas de lista (ministérios, setores, servos, escalas) montavam
 * isso à mão — e cada uma escrevia **duas vezes** o mesmo conteúdo, uma para
 * a tabela e outra para a lista mobile, com o risco óbvio de divergirem.
 *
 * Aqui as colunas são declaradas uma vez e servem às duas formas: `header`
 * vira o `<th>` no desktop e o rótulo do campo no card do celular.
 */
export default function DataPanel<T>({
  title,
  toolbar,
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: {
  title: React.ReactNode;
  /** SearchInput, FilterSelect e afins. Ficam à direita do título. */
  toolbar?: React.ReactNode;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty: React.ReactNode;
  className?: string;
}) {
  const clickable = Boolean(onRowClick);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  return (
    <Panel
      title={title}
      action={toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}
      className={className}
    >
      {/* Desktop */}
      <div className="admin-table-wrap overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              {columns.map((c) => (
                <th
                  key={c.header}
                  scope="col"
                  className={cn("p-3 text-xs font-bold uppercase tracking-[0.03em] text-muted-foreground",
                    c.align === "right" && "text-right")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border transition-colors",
                  clickable && "cursor-pointer hover:bg-muted",
                )}
              >
                {columns.map((c) => (
                  <td key={c.header} className={cn("p-3", c.align === "right" && "text-right")}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Celular */}
      <div className="admin-mobile-list">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn("card grid gap-2.5", clickable && "cursor-pointer")}
          >
            {mobileColumns.map((c) =>
              c.primary ? (
                <div key={c.header} className="font-semibold">
                  {c.cell(row)}
                </div>
              ) : (
                <div key={c.header} className="grid gap-0.5">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.03em] text-muted-foreground">
                    {c.header}
                  </span>
                  <div className="text-sm">{c.cell(row)}</div>
                </div>
              ),
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">{empty}</p>
        )}
      </div>
    </Panel>
  );
}
