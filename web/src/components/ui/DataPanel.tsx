"use client";

import LoadingDots from "@/components/ui/LoadingDots";
import Panel from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

export interface Column<T> {
  /** Nome da coluna: vira o <th> no desktop e o rótulo do campo no celular. */
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Sem rótulo no celular — o valor sai puro, do jeito que o `cell` desenhar.
   *  Normalmente é uma só (o título do card), mas outra coluna do mesmo
   *  `mobileRow` também pode usar pra ficar no mesmo estilo. */
  primary?: boolean;
  align?: "left" | "right";
  /** Esconde a coluna no celular, para dados que só fazem sentido na tabela. */
  hideOnMobile?: boolean;
  /** Agrupa colunas na mesma linha do card mobile. Colunas com o mesmo
   *  número ficam lado a lado, na ordem declarada; sem isso cada coluna
   *  continua em sua própria linha (comportamento padrão, inalterado). */
  mobileRow?: number;
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
  stackToolbar = false,
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  loading = false,
  className,
  style,
}: {
  title: React.ReactNode;
  /** SearchInput, FilterSelect e afins. Ficam à direita do título. */
  toolbar?: React.ReactNode;
  /** Empilha a barra abaixo do título, para quando ela tem controles demais. */
  stackToolbar?: boolean;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty: React.ReactNode;
  /** Enquanto verdadeiro, mostra os pontinhos no lugar dos dados. */
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clickable = Boolean(onRowClick);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  // Colunas com o mesmo `mobileRow` viram um único grupo, renderizado lado a
  // lado; as demais seguem uma por grupo, igual sempre foi.
  const mobileGroups: Column<T>[][] = [];
  const groupByRow = new Map<number, Column<T>[]>();
  for (const c of mobileColumns) {
    if (c.mobileRow === undefined) {
      mobileGroups.push([c]);
      continue;
    }
    let group = groupByRow.get(c.mobileRow);
    if (!group) {
      group = [];
      groupByRow.set(c.mobileRow, group);
      mobileGroups.push(group);
    }
    group.push(c);
  }

  return (
    <Panel
      title={title}
      action={toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}
      stack={stackToolbar}
      className={className}
      style={style}
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
            {!loading && rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border transition-colors",
                  clickable && "cursor-pointer hover:bg-muted",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.header}
                    className={cn("p-3 text-sm", c.align === "right" && "text-right")}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                  <LoadingDots />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
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
        {!loading && rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn("card grid gap-2.5", clickable && "cursor-pointer")}
          >
            {mobileGroups.map((group) => (
              <div key={group.map((c) => c.header).join("+")} className={cn(group.length > 1 && "flex items-center justify-between gap-3")}>
                {group.map((c) =>
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
          </div>
        ))}
        {loading && (
          <p className="py-12 text-center text-muted-foreground">
            <LoadingDots />
          </p>
        )}
        {!loading && rows.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">{empty}</p>
        )}
      </div>
    </Panel>
  );
}
