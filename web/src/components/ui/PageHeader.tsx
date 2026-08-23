import { cn } from "@/lib/cn";

/**
 * Cabeçalho de tela: título e uma linha de apoio embaixo.
 *
 * Serve os dois casos: as telas de lista passam só `title` + `subtitle`
 * (a descrição da seção), e as telas de detalhe acrescentam o ladrilho de
 * `icon` e o nome da entidade. `action` encosta à direita — botões de
 * editar/excluir vão aqui.
 *
 * O subtítulo é esmaecido por padrão; quem passa um elemento com cor própria
 * (um Link, por exemplo) continua mandando na cor.
 */
export default function PageHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-10 flex items-center gap-4", className)}>
      {icon && (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        {/* Sem `truncate`: título de tela quebra linha em vez de virar
            reticências — o `action` ao lado é shrink-0, então não estoura. */}
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <div className="text-[0.9375rem] text-muted-foreground">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}
