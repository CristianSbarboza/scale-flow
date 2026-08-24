import {
  Flower2,
  Car,
  Dumbbell,
  Heart,
  Star,
  Music,
  Camera,
  BookOpen,
  Coffee,
  Sun,
  Volleyball,
  Mic,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones do círculo de perfil do servo — servo ainda não sobe foto própria,
 * então isto é a alternativa à inicial do nome (ver Avatar.tsx). A chave é o
 * que fica salvo em `users.avatarIcon`; nunca renomear uma chave existente
 * sem migrar as linhas que já a usam.
 */
export const AVATAR_ICONS = {
  flower: { label: "Flor", Icon: Flower2 },
  car: { label: "Carro", Icon: Car },
  strength: { label: "Força", Icon: Dumbbell },
  heart: { label: "Coração", Icon: Heart },
  star: { label: "Estrela", Icon: Star },
  music: { label: "Música", Icon: Music },
  camera: { label: "Câmera", Icon: Camera },
  book: { label: "Livro", Icon: BookOpen },
  coffee: { label: "Café", Icon: Coffee },
  sun: { label: "Sol", Icon: Sun },
  ball: { label: "Bola", Icon: Volleyball },
  mic: { label: "Microfone", Icon: Mic },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type AvatarIconKey = keyof typeof AVATAR_ICONS;

export function isAvatarIconKey(value: string): value is AvatarIconKey {
  return value in AVATAR_ICONS;
}
