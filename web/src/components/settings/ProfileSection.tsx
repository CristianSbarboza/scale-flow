import { User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import SettingsSection from "@/components/ui/SettingsSection";

/** Perfil: quem está logado. O admin mostra o papel; o servo, o setor. */
export default function ProfileSection({
  name,
  subtitle,
  badge,
  color,
}: {
  name: string;
  subtitle?: string | null;
  badge?: string;
  color?: string | null;
}) {
  return (
    <SettingsSection title="Perfil" icon={<User size={14} />}>
      <div className="flex items-center gap-4">
        <Avatar name={name} size="xl" color={color} />
        <div className="min-w-0">
          <p className="truncate text-[1.0625rem] font-semibold">{name}</p>
          {subtitle && <p className="truncate text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
          {/* Sem `solid`: o papel é uma legenda do perfil, não um estado que
              precise de pílula. O fundo arredondado sugeria algo clicável. */}
          {badge && <Badge className="mt-1.5">{badge}</Badge>}
        </div>
      </div>
    </SettingsSection>
  );
}
