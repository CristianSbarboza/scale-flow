export type PhoneProfileId = "admin" | "leader" | "servant" | "coordinator";

export type PhoneSceneId =
  | "role_admin"
  | "role_leader"
  | "role_servant"
  | "role_coordinator"
  | "moment_cale"
  | "moment_disponibilidade"
  | "moment_escala"
  | "moment_trocas"
  | "moment_whatsapp"
  | "moment_igreja";

export interface LandingPrinciple {
  numeral: string;
  title: string;
  description: string;
}

export interface LandingProfileCard {
  sceneId: PhoneSceneId;
  profileId: PhoneProfileId;
  badge: string;
  accessWay: string;
  title: string;
  description: string;
  highlights: string[];
  isDifferential?: boolean;
}

export interface LandingMoment {
  id: PhoneSceneId;
  number: string;
  roleLabel: string;
  title: string;
  description: string;
  tags: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const PRINCIPLES: LandingPrinciple[] = [
  {
    numeral: "i.",
    title: "Peça conversando, não preenchendo tabelas.",
    description:
      "Diga os dias e horários dos cultos como você falaria no WhatsApp. A assistente Cale identifica o setor, aplica exceções do mês e monta o rascunho para você.",
  },
  {
    numeral: "ii.",
    title: "Nada vai ao ar sem a sua revisão.",
    description:
      "A IA prepara datas e horários uma escala por vez, mas toda publicação passa pela confirmação explícita de quem lidera o ministério ou coordena o setor.",
  },
  {
    numeral: "iii.",
    title: "Cada papel vê apenas o que lhe cabe.",
    description:
      "Administrador, Líder de Ministério, Servo e Coordenador enxergam telas sob medida — sem menus desnecessários e com isolamento rígido por igreja.",
  },
];

export const PROFILE_CARDS: LandingProfileCard[] = [
  {
    sceneId: "role_admin",
    profileId: "admin",
    badge: "Perfil 01 · Administrador",
    accessWay: "Acesso por e-mail · Visão de toda a igreja",
    title: "Administrador: a visão panorâmica da igreja.",
    description:
      "Acompanha em uma só tela os números gerais de Ministérios, Setores, Servos e Escalas Ativas da comunidade. É o único perfil que cria e desativa Ministérios, nomeia um ou múltiplos líderes para cada área e configura a conta da igreja e seu provedor de IA.",
    highlights: [
      "Gestão de Ministérios",
      "Múltiplos líderes",
      "Configuração da igreja & IA",
      "Visão Geral completa",
    ],
  },
  {
    sceneId: "role_leader",
    profileId: "leader",
    badge: "Perfil 02 · Líder de Ministério",
    accessWay: "Acesso por e-mail · Escopo do seu ministério",
    title: "Líder de Ministério: autonomia total nas suas equipes.",
    description:
      "Abre o painel já filtrado no próprio ministério (como Comunicação ou Louvor), sem interferir nas demais áreas. Cria setores, cadastra servos com geração automática de senha de primeiro acesso, escolhe quem será coordenador de setor, escala equipes e acompanha o calendário mensal.",
    highlights: [
      "Setores do ministério",
      "Cadastro de servos",
      "Promover Coordenador ★",
      "Escalas & Calendário",
    ],
  },
  {
    sceneId: "role_servant",
    profileId: "servant",
    badge: "Perfil 03 · Servo",
    accessWay: "Usuário + igreja · Área pessoal leve",
    title: "Servo: agenda pessoal, disponibilidade e trocas diretas.",
    description:
      "Entra apenas com seu usuário e o identificador da igreja — sem precisar ter ou lembrar de e-mail. Vê seus dias confirmados no Calendário mensal, acompanha as abas Atual, Próxima e Todas, negocia substituições pelo sino de notificações, personaliza seu tema (Escuro, Claro ou Jess) e consulta a Cale pelo botão flutuante.",
    highlights: [
      "Calendário pessoal",
      "Atual, Próxima e Todas",
      "Sino de trocas",
      "Temas Escuro, Claro e Jess",
    ],
  },
  {
    sceneId: "role_coordinator",
    profileId: "coordinator",
    badge: "Diferencial · Servo Coordenador",
    accessWay: "Ativado por setor · Ganha a aba extra “Gestão”",
    title: "Servo Coordenador: cuida do setor sem perder a visão de servo.",
    description:
      "Quando o líder marca um servo como coordenador em um ou mais setores, surge automaticamente a aba Gestão dentro do seu painel de servo. Nela, ele cria escalas públicas ou privadas, vê quem marcou disponibilidade, alterna entre Rascunho e Publicada, duplica datas entre os setores que coordena e usa a IA Cale para montar rascunhos.",
    highlights: [
      "Aba extra Gestão",
      "Publicada / Rascunho",
      "Duplicar entre setores",
      "Cale IA para o setor",
    ],
    isDifferential: true,
  },
];

export const MOMENTS: LandingMoment[] = [
  {
    id: "moment_cale",
    number: "01",
    roleLabel: "Líder ou Coordenador",
    title: "Peça a escala conversando.",
    description:
      "“Quero criar a escala de Fotografia de novembro: domingos às 10h e 18h30, quintas às 19h30, sem culto na manhã do último domingo.” A Cale entende o setor pelo nome, lista as datas uma escala por vez e aguarda sua confirmação.",
    tags: ["Assistente Cale", "Linguagem natural", "Confirmação individual"],
  },
  {
    id: "moment_disponibilidade",
    number: "02",
    roleLabel: "Servo",
    title: "Um único link colhe a disponibilidade.",
    description:
      "Ao publicar a escala ou copiar o link compartilhável, cada servo toca nos dias em que pode servir — seja direto pelo link público ou autenticado na aba Próxima do seu painel.",
    tags: ["Aba Próxima", "Pública ou privada", "Mobile-first"],
  },
  {
    id: "moment_escala",
    number: "03",
    roleLabel: "Líder ou Coordenador",
    title: "Distribua a equipe com equilíbrio.",
    description:
      "Veja quem respondeu disponível em cada culto, escale os membros do setor sem conflito de horário, duplique o modelo para setores irmãos e vire a chave para Publicada quando estiver pronta.",
    tags: ["Visão por culto", "Duplicar escala", "Situação Publicada"],
  },
  {
    id: "moment_trocas",
    number: "04",
    roleLabel: "Servo",
    title: "Imprevistos se resolvem pelo sino de trocas.",
    description:
      "No próprio Calendário pessoal, o servo solicita troca com outro colega confirmado do setor. O pedido acende no sino de notificações do irmão e, ao aceitar, o dia passa para ele na hora.",
    tags: ["Sino de notificações", "Troca entre servos", "Atualização imediata"],
  },
  {
    id: "moment_whatsapp",
    number: "05",
    roleLabel: "Servo ativo",
    title: "Ninguém esquece o dia de servir.",
    description:
      "Um serviço dedicado envia avisos no WhatsApp quando uma nova escala abre para preenchimento e lembra cada servo antes do culto — com controle automático contra mensagens repetidas.",
    tags: ["WhatsApp automático", "Aviso de abertura", "Lembrete de culto"],
  },
  {
    id: "moment_igreja",
    number: "06",
    roleLabel: "Administrador & Líder",
    title: "Pausa sem perda de histórico.",
    description:
      "Precisa pausar temporariamente um servo em período sabático, um setor ou um ministério? Basta desativar a chave Situação: ele para de receber WhatsApp e não entra em novas escalas, preservando todo o histórico.",
    tags: ["Desativação segura", "Multi-igreja", "Histórico preservado"],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Qual a diferença entre Administrador, Líder de Ministério, Coordenador e Servo?",
    answer:
      "O Administrador enxerga toda a igreja, cria ministérios e define seus líderes. O Líder gerencia setores, servos e escalas do seu próprio ministério. O Servo acessa sua agenda pessoal, marca disponibilidade e faz trocas. Já o Servo Coordenador é um servo com autonomia extra (aba Gestão) para criar, duplicar e publicar escalas apenas dos setores que coordena.",
  },
  {
    question: "Os servos precisam ter e-mail ou instalar aplicativo da loja?",
    answer:
      "Não. O servo entra usando apenas seu nome de usuário + o identificador da igreja, ou responde direto pelo link público da escala. Se desejar, pode adicionar o ScaleFlow à tela inicial do celular (PWA) no iOS e Android em segundos.",
  },
  {
    question: "Como funciona a assistente de IA Cale para cada perfil?",
    answer:
      "A Cale respeita exatamente as permissões de quem está conversando: para Servos, ela consulta escalas, grava disponibilidade e solicita trocas; para Coordenadores, monta rascunhos dos setores coordenados; para Líderes e Administradores, apoia também no cadastro e organização ministerial — sempre confirmando antes de criar.",
  },
  {
    question: "Os lembretes pelo WhatsApp são enviados para quem está afastado?",
    answer:
      "Não. Ao desativar a chave Situação de um servo, setor ou ministério, o ScaleFlow silencia automaticamente os lembretes de WhatsApp e bloqueia novos preenchimentos, sem apagar nenhum registro antigo.",
  },
  {
    question: "Um mesmo ministério pode ter mais de um líder e vários setores?",
    answer:
      "Sim. Um ministério pode ter múltiplos líderes atuando juntos e quantos setores precisar (por exemplo: Fotografia, Transmissão, Projeção e Áudio dentro de Comunicação), inclusive com um mesmo coordenador cuidando de mais de um setor.",
  },
  {
    question: "Os dados da minha igreja ficam separados de outras comunidades?",
    answer:
      "Sim. O isolamento multi-igreja é verificado em todas as leituras e gravações do sistema: ministérios, setores, servos, escalas e ferramentas da IA operam exclusivamente dentro da sua igreja.",
  },
];

export function buildLandingJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "ScaleFlow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        inLanguage: "pt-BR",
        url: siteUrl,
        description:
          "Plataforma de gestão de escalas ministeriais com perfis dedicados para Administrador, Líder de Ministério, Servo e Coordenador, assistente de IA Cale e lembretes no WhatsApp.",
        featureList: [
          "Perfis sob medida: Administrador, Líder de Ministério, Servo e Servo Coordenador",
          "Assistente de IA Cale respeitando o escopo de cada papel",
          "Coleta de disponibilidade por link público ou área do servo",
          "Trocas de escala pelo calendário e sino de notificações",
          "Lembretes automáticos via WhatsApp apenas para membros ativos",
          "Arquitetura multi-igreja com desativação não-destrutiva",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}
