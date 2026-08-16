import Link from "next/link";
import { cn } from "@/lib/cn";

export interface StatItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  /** Tela que lista esses itens. Com href, o número vira atalho para ela. */
  href?: string;
}

/**
 * Régua de números logo abaixo do título da página.
 *
 * Substitui o baralho de cards que ocupava 200px e escondia três dos quatro
 * números atrás de um clique. Aqui os quatro ficam visíveis em ~24px, e a
 * tela sobra para o conteúdo.
 */
export default function StatsRule({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4",
        className,
      )}
    >
      {items.map(({ icon: Icon, label, value, href }) => {
        const content = (
          <>
            <Icon size={16} className="text-primary" />
            <span className="font-bold">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </>
        );

        if (!href) {
          return (
            <div key={label} className="flex items-center gap-2 px-2 py-1">
              {content}
            </div>
          );
        }

        return (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
