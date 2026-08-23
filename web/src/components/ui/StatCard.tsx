import Card from "@/components/ui/Card";
import SectionLabel from "@/components/ui/SectionLabel";

/** Card de número: rótulo pequeno em cima, valor grande embaixo. */
export default function StatCard({
  label,
  value,
  accent = "primary",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  accent?: "primary" | "success" | "destructive";
  className?: string;
}) {
  return (
    <Card accent={accent} className={className}>
      <SectionLabel className="mb-1">{label}</SectionLabel>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  );
}
