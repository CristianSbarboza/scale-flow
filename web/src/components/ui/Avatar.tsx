import { User } from "lucide-react";
import { AVATAR_ICONS, isAvatarIconKey } from "@/lib/avatarIcons";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-14 text-xl",
} as const;

const iconSize = { sm: 14, md: 18, lg: 22, xl: 24 } as const;

/**
 * Círculo com a inicial do nome. Cai no ícone de usuário quando não há nome.
 *
 * Estava escrito à mão em quatro lugares, em quatro tamanhos diferentes
 * (32, 40, 48 e 56px) — daí a escala nomeada em vez de um número solto.
 *
 * `color` existe porque o servo pode escolher a própria cor de perfil.
 * `icon` idem: servo ainda não sobe foto própria, então pode trocar a inicial
 * por um ícone de um conjunto fixo (ver src/lib/avatarIcons.tsx).
 */
export default function Avatar({
  name,
  size = "md",
  color,
  icon,
  className,
}: {
  name?: string | null;
  size?: keyof typeof sizes;
  color?: string | null;
  icon?: string | null;
  className?: string;
}) {
  const initial = name?.trim().charAt(0).toUpperCase();
  const ChosenIcon = icon && isAvatarIconKey(icon) ? AVATAR_ICONS[icon].Icon : null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        sizes[size],
        !color && "bg-primary",
        className,
      )}
      style={color ? { background: color } : undefined}
      aria-hidden
    >
      {ChosenIcon ? <ChosenIcon size={iconSize[size]} /> : initial || <User size={iconSize[size]} />}
    </div>
  );
}
