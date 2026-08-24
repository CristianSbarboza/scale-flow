"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import AvatarIconPicker from "@/components/ui/AvatarIconPicker";
import Badge from "@/components/ui/Badge";
import SettingsSection from "@/components/ui/SettingsSection";
import { updateOwnAvatarIcon } from "@/lib/actions/account";
import { isAvatarIconKey, type AvatarIconKey } from "@/lib/avatarIcons";

/**
 * Perfil: quem está logado. O admin mostra o papel; o servo, o setor.
 *
 * `editableIcon` só vem `true` da tela do servo: é quem ainda não tem upload
 * de foto própria, então o círculo aceita um ícone de um conjunto fixo no
 * lugar da inicial do nome.
 */
export default function ProfileSection({
  name,
  subtitle,
  badge,
  color,
  icon,
  editableIcon = false,
}: {
  name: string;
  subtitle?: string | null;
  badge?: string;
  color?: string | null;
  icon?: string | null;
  editableIcon?: boolean;
}) {
  const router = useRouter();
  const [currentIcon, setCurrentIcon] = useState<AvatarIconKey | null>(
    icon && isAvatarIconKey(icon) ? icon : null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const escolher = async (novo: AvatarIconKey | null) => {
    setShowPicker(false);
    setSaving(true);
    try {
      await updateOwnAvatarIcon(novo);
      setCurrentIcon(novo);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Perfil" icon={<User size={14} />}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar name={name} size="xl" color={color} icon={currentIcon} />
          {editableIcon && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              disabled={saving}
              aria-label="Escolher ícone de perfil"
              className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.0625rem] font-semibold">{name}</p>
          {subtitle && <p className="truncate text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
          {/* Sem `solid`: o papel é uma legenda do perfil, não um estado que
              precise de pílula. O fundo arredondado sugeria algo clicável. */}
          {badge && <Badge className="mt-1.5">{badge}</Badge>}
        </div>
      </div>

      {showPicker && (
        <AvatarIconPicker value={currentIcon} onConfirm={escolher} onClose={() => setShowPicker(false)} />
      )}
    </SettingsSection>
  );
}
