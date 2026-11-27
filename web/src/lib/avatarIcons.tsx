import {
  // Padrão (os 12 originais preservados exatamente como eram)
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
  // Fé & Igreja (10)
  Church,
  Cross,
  Flame,
  Crown,
  Sparkles,
  HandHeart,
  Shield,
  Anchor,
  Bird,
  Bell,
  // Louvor & Mídia (10)
  Guitar,
  Piano,
  Drum,
  Headphones,
  Radio,
  Video,
  Film,
  Tv,
  Speaker,
  Disc3,
  // Natureza & Animais (10)
  Cat,
  Dog,
  Fish,
  Rabbit,
  Squirrel,
  Bug,
  Trees,
  Mountain,
  CloudSun,
  Moon,
  // Esportes & Jogos (10)
  Trophy,
  Medal,
  Gamepad2,
  Bike,
  Swords,
  Target,
  Rocket,
  Zap,
  Compass,
  Flag,
  // Estilo & Dia a Dia (10)
  Smile,
  Glasses,
  Gem,
  Palette,
  Brush,
  Laptop,
  Code2,
  Pizza,
  IceCreamCone,
  Plane,
  type LucideIcon,
} from "lucide-react";

export type AvatarIconCategoryKey =
  | "default"
  | "faith"
  | "worship"
  | "nature"
  | "sports"
  | "lifestyle";

export const AVATAR_ICON_CATEGORIES: {
  key: AvatarIconCategoryKey;
  label: string;
}[] = [
  { key: "default", label: "Padrão" },
  { key: "faith", label: "Fé & Igreja" },
  { key: "worship", label: "Louvor & Mídia" },
  { key: "nature", label: "Natureza" },
  { key: "sports", label: "Esportes & Jogos" },
  { key: "lifestyle", label: "Dia a Dia" },
];

/**
 * Ícones do círculo de perfil do servo — servo ainda não sobe foto própria,
 * então isto é a alternativa à inicial do nome (ver Avatar.tsx). A chave é o
 * que fica salvo em `users.avatarIcon`; nunca renomear uma chave existente
 * sem migrar as linhas que já a usam.
 */
export const AVATAR_ICONS = {
  // --- Categoria: Padrão (12 ícones originais intactos) ---
  flower: { label: "Flor", category: "default", Icon: Flower2 },
  car: { label: "Carro", category: "default", Icon: Car },
  strength: { label: "Força", category: "default", Icon: Dumbbell },
  heart: { label: "Coração", category: "default", Icon: Heart },
  star: { label: "Estrela", category: "default", Icon: Star },
  music: { label: "Música", category: "default", Icon: Music },
  camera: { label: "Câmera", category: "default", Icon: Camera },
  book: { label: "Livro", category: "default", Icon: BookOpen },
  coffee: { label: "Café", category: "default", Icon: Coffee },
  sun: { label: "Sol", category: "default", Icon: Sun },
  ball: { label: "Bola", category: "default", Icon: Volleyball },
  mic: { label: "Microfone", category: "default", Icon: Mic },

  // --- Categoria 1: Fé & Igreja (10 opções) ---
  church: { label: "Igreja", category: "faith", Icon: Church },
  cross: { label: "Cruz", category: "faith", Icon: Cross },
  flame: { label: "Chama", category: "faith", Icon: Flame },
  crown: { label: "Coroa", category: "faith", Icon: Crown },
  sparkles: { label: "Brilho", category: "faith", Icon: Sparkles },
  hand_heart: { label: "Amor & Serviço", category: "faith", Icon: HandHeart },
  shield: { label: "Escudo da Fé", category: "faith", Icon: Shield },
  anchor: { label: "Âncora", category: "faith", Icon: Anchor },
  dove: { label: "Pomba", category: "faith", Icon: Bird },
  bell: { label: "Sino", category: "faith", Icon: Bell },

  // --- Categoria 2: Louvor & Mídia (10 opções) ---
  guitar: { label: "Violão / Guitarra", category: "worship", Icon: Guitar },
  piano: { label: "Teclado / Piano", category: "worship", Icon: Piano },
  drum: { label: "Bateria", category: "worship", Icon: Drum },
  headphones: { label: "Fone de Ouvido", category: "worship", Icon: Headphones },
  radio: { label: "Transmissão", category: "worship", Icon: Radio },
  video: { label: "Filmadora", category: "worship", Icon: Video },
  film: { label: "Cinema / Vídeo", category: "worship", Icon: Film },
  tv: { label: "Projeção / Telão", category: "worship", Icon: Tv },
  speaker: { label: "Caixa de Som", category: "worship", Icon: Speaker },
  disc: { label: "Disco", category: "worship", Icon: Disc3 },

  // --- Categoria 3: Natureza (10 opções) ---
  cat: { label: "Gato", category: "nature", Icon: Cat },
  dog: { label: "Cachorro", category: "nature", Icon: Dog },
  fish: { label: "Peixe", category: "nature", Icon: Fish },
  rabbit: { label: "Coelho", category: "nature", Icon: Rabbit },
  squirrel: { label: "Esquilo", category: "nature", Icon: Squirrel },
  butterfly: { label: "Inseto / Natureza", category: "nature", Icon: Bug },
  trees: { label: "Árvores", category: "nature", Icon: Trees },
  mountain: { label: "Montanha", category: "nature", Icon: Mountain },
  cloud_sun: { label: "Céu", category: "nature", Icon: CloudSun },
  moon: { label: "Lua", category: "nature", Icon: Moon },

  // --- Categoria 4: Esportes & Jogos (10 opções) ---
  trophy: { label: "Troféu", category: "sports", Icon: Trophy },
  medal: { label: "Medalha", category: "sports", Icon: Medal },
  gamepad: { label: "Videogame", category: "sports", Icon: Gamepad2 },
  bike: { label: "Ciclismo", category: "sports", Icon: Bike },
  swords: { label: "Desafio", category: "sports", Icon: Swords },
  target: { label: "Alvo", category: "sports", Icon: Target },
  rocket: { label: "Foguete", category: "sports", Icon: Rocket },
  zap: { label: "Raio", category: "sports", Icon: Zap },
  compass: { label: "Bússola", category: "sports", Icon: Compass },
  flag: { label: "Bandeira", category: "sports", Icon: Flag },

  // --- Categoria 5: Dia a Dia (10 opções) ---
  smile: { label: "Sorriso", category: "lifestyle", Icon: Smile },
  glasses: { label: "Óculos", category: "lifestyle", Icon: Glasses },
  gem: { label: "Diamante", category: "lifestyle", Icon: Gem },
  palette: { label: "Arte", category: "lifestyle", Icon: Palette },
  brush: { label: "Pincel", category: "lifestyle", Icon: Brush },
  laptop: { label: "Notebook", category: "lifestyle", Icon: Laptop },
  code: { label: "Tecnologia", category: "lifestyle", Icon: Code2 },
  pizza: { label: "Pizza", category: "lifestyle", Icon: Pizza },
  ice_cream: { label: "Sorvete", category: "lifestyle", Icon: IceCreamCone },
  plane: { label: "Viagem", category: "lifestyle", Icon: Plane },
} satisfies Record<
  string,
  { label: string; category: AvatarIconCategoryKey; Icon: LucideIcon }
>;

export type AvatarIconKey = keyof typeof AVATAR_ICONS;

export function isAvatarIconKey(value: string): value is AvatarIconKey {
  return value in AVATAR_ICONS;
}
