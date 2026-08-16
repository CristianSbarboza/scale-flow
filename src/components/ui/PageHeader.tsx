import { cn } from "@/lib/cn";

/**
 * Cabeçalho das telas de detalhe: ladrilho com ícone, título e uma linha de
 * apoio embaixo (nome do ministério, e-mail do servo, etc).
 *
 * `action` encosta à direita — botões de editar/excluir vão aqui.
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
        <h1 className="truncate text-3xl">{title}</h1>
        {subtitle && <div className="text-[0.9375rem]">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}
