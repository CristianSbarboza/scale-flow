import { cn } from "@/lib/cn";

/** Texto de lista vazia. Todas as telas escreviam o mesmo parágrafo em itálico. */
export default function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("p-6 text-center text-sm italic text-muted-foreground", className)}>
      {children}
    </p>
  );
}
