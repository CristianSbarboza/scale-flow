import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/**
 * Painel com título: a superfície de vidro que agrupa uma lista ou um bloco
 * de conteúdo. É o container padrão das telas de admin.
 *
 * Estava escrito à mão em seis lugares, em duas variantes que só diferiam em
 * ter ou não algo à direita do título — `margin: 0` no h3 quando tinha,
 * `marginBottom: 1.5rem` quando não. `action` resolve as duas.
 *
 * `stack` empilha o título e a ação em vez de deixá-los lado a lado, para o
 * caso de a ação ser larga (uma barra de filtros, por exemplo).
 */
export default function Panel({
  title,
  action,
  stack = false,
  children,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  stack?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card glass className={className}>
      <div
        className={cn(
          "mb-6 gap-3",
          stack ? "flex flex-col" : "flex flex-wrap items-center justify-between",
        )}
      >
        <h3 className="m-0">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}
