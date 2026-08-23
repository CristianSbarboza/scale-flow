import Card from "@/components/ui/Card";
import SectionLabel from "@/components/ui/SectionLabel";
import { cn } from "@/lib/cn";

/**
 * Bloco de uma tela de configurações: card de vidro com rótulo e um ícone.
 *
 * `tone="destructive"` marca o bloco de ações perigosas — hoje só o de encerrar
 * sessão.
 */
export default function SettingsSection({
  title,
  icon,
  tone = "default",
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: "default" | "destructive";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card glass className={cn(tone === "destructive" && "border-destructive/30", className)}>
      <div className="mb-4 flex items-center gap-2">
        {icon && (
          <span className={tone === "destructive" ? "text-destructive" : "text-primary"}>{icon}</span>
        )}
        <SectionLabel className={tone === "destructive" ? "text-destructive" : undefined}>
          {title}
        </SectionLabel>
      </div>
      {children}
    </Card>
  );
}
