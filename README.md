<div align="center">
  <img src="./web/public/logo-mark.png" alt="Logo do ScaleFlow" width="76" height="76" />

  <h1>ScaleFlow — Gestão de Escalas Ministeriais</h1>

  <p>
    <strong>A escala da igreja feita em paz.</strong><br />
    Disponibilidade em um único link, rascunhos inteligentes com a assistente de IA <strong>Cale</strong>, trocas diretas entre servos e lembretes automáticos no WhatsApp.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.3-000000?style=flat-square&logo=next.js" alt="Next.js 16.3" />
    <img src="https://img.shields.io/badge/React-19.2-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19.2" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/PostgreSQL-Neon_%2F_Docker-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
    <img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=flat-square&logo=whatsapp&logoColor=white" alt="WhatsApp Baileys" />
  </p>
</div>

---

## Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Perfis de Acesso e Funcionalidades](#-perfis-de-acesso-e-funcionalidades)
- [Arquitetura do Monorepo](#-arquitetura-do-monorepo)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Como Instalar e Rodar](#-como-instalar-e-rodar)
- [Como Usar](#-como-usar)
- [Deploy em Produção](#-deploy-em-produção)
- [Como Contribuir](#-como-contribuir)
- [Licença e Créditos](#-licença-e-créditos)

---

## 📖 Sobre o Projeto

Organizar quem serve em cada culto costuma consumir metade da energia de quem lidera um ministério: cobrar respostas em grupos de mensagens, cruzar horários em planilhas na sexta à noite, lidar com trocas de última hora e lembrar cada voluntário individualmente antes do culto.

O **ScaleFlow** foi criado para assumir esse trabalho operacional e devolver o tempo da liderança ao cuidado com as pessoas. Ele reúne toda a igreja em uma plataforma **multi-igreja** com isolamento rígido de dados, interfaces sob medida para cada papel ministerial, assistente conversacional de IA (**Cale**) e um serviço dedicado de avisos e lembretes pelo **WhatsApp**.

### Principais desafios resolvidos na arquitetura

- **Isolamento multi-igreja em todas as camadas:** toda leitura e mutação valida a barreira da igreja antes de qualquer regra de papel (`web/src/lib/scope.ts`).
- **WhatsApp desacoplado da web:** `web/` e `whatsapp/` compartilham exclusivamente o banco PostgreSQL. Não há chamadas HTTP entre eles — se o frontend passar por manutenção, os lembretes de culto continuam saindo no horário com reserva atômica (`notification_log`) contra envios duplicados.
- **IA com permissões reais e confirmação humana:** a assistente **Cale** utiliza as mesmas *Server Actions* e regras de escopo do usuário logado, montando rascunhos uma escala por vez e exigindo confirmação explícita antes de ações sensíveis.
- **Desativação não-destrutiva (`isActive`):** servos em período sabático, setores ou ministérios inteiros podem ser pausados sem apagar nenhum histórico; enquanto desativados, ficam automaticamente silenciados no WhatsApp e fora de novos preenchimentos.

---

## 👥 Perfis de Acesso e Funcionalidades

Cada pessoa enxerga apenas o que precisa para servir bem:

### 1. Administrador (`admin`)
- **Visão Geral da Igreja:** acompanha em tempo real os indicadores de Ministérios, Setores, Servos e Escalas Ativas de toda a comunidade.
- **Gestão de Ministérios e Múltiplos Líderes:** cria/desativa ministérios e nomeia um ou vários líderes por área.
- **Configurações da Comunidade e IA:** gerencia os dados da igreja e conecta o provedor da assistente **Cale** (Groq, Google Gemini ou OpenAI).

### 2. Líder de Ministério (`leader`)
- **Painel Escopado:** abre o painel administrativo filtrado automaticamente nos ministérios que lidera (ex.: *Comunicação*, *Louvor*).
- **Equipes e Senha de Primeiro Acesso:** cria setores, cadastra servos com geração automática de senha temporária, ativa/desativa membros e define quem atua como **Coordenador de Setor (★)**.
- **Gestão Completa de Escalas:** cria escalas com datas, horários e **título opcional por culto** (ex.: *Culto de Santa Ceia*), acompanha disponibilidades, escala servos, duplica escalas e **exporta os confirmados em PDF**.

### 3. Servo (`servant`)
- **Acesso Leve sem E-mail:** entra usando apenas seu `usuário` + identificador da `igreja` (com preenchimento automático via `?igreja=`), além de suporte a instalação como aplicativo (**PWA**).
- **Calendário e Abas Pessoais:** visualiza seus dias confirmados no **Calendário** mensal e acompanha as escalas do setor nas abas **Atual**, **Próxima** e **Todas**.
- **Trocas pelo Sino de Notificações:** solicita substituição a outro colega do setor e aceita/recusa pedidos recebidos com atualização imediata na agenda.
- **Temas Visuais:** escolha pessoal entre os temas **Escuro**, **Claro** e **Jess**.

### ★ Diferencial: Servo Coordenador (`isCoordinator`)
- Quando um líder marca um servo como coordenador em um ou mais setores, ele mantém sua visão leve de servo em `/servant` e ganha automaticamente a **5ª aba `Gestão`**.
- Pela aba **Gestão**, ele filtra entre os setores que coordena, cria escalas públicas ou privadas, copia o link compartilhável `/escala/...`, alterna a situação **Rascunho / Publicada**, **duplica** escalas entre seus setores e conversa com a **Cale IA** para gerar rascunhos do setor.

### Recursos Transversais
- **Assistente Cale (IA):** conversa em linguagem natural respeitando o papel logado (consulta de agenda, marcação de disponibilidade, pedidos de troca e criação guiada de escalas).
- **Avisos e Lembretes no WhatsApp:** notifica o setor quando uma escala é publicada para preenchimento e envia lembretes automáticos na véspera (09h) e 2 horas antes de cada culto, acompanhados de saudação personalizada e versículo.
- **Site Institucional Interativo (`/`):** página pública otimizada para SEO (SSG, OpenGraph, Sitemap e JSON-LD) com simulador ao vivo dos 3 perfis + diferencial Coordenador.

---

## 🧱 Arquitetura do Monorepo

```mermaid
flowchart LR
    U["Navegador / PWA"] --> W["web/ (Next.js 16 · Vercel)"]
    W --> DB[("PostgreSQL (Neon / Docker)")]
    WA["whatsapp/ (Node.js · Baileys · VPS)"] --> DB
    WA --> WP["WhatsApp dos Servos"]
```

```text
scale-flow/
├── web/                  # Aplicação principal Next.js 16 (App Router) + Drizzle ORM
│   ├── drizzle/manual/   # Migrações SQL manuais numeradas e auditáveis
│   ├── public/           # Ícones, manifesto PWA e identidade visual
│   └── src/
│       ├── app/          # Rotas: institucional (/), /login, /admin/*, /servant, /escala/[link]
│       ├── components/   # Componentes de UI, painéis e simulador institucional
│       ├── db/           # Schema Drizzle, conexão e scripts operacionais
│       ├── lib/          # Server Actions por domínio, escopo multi-igreja e ferramentas de IA
│       └── styles/       # Design System baseado em tokens semânticos CSS
├── whatsapp/             # Worker independente em POO (Baileys + Express /qr e /health)
├── specs/                # Especificações SDD (constitution.md + 01 a 09)
└── docker-compose.yml    # Banco PostgreSQL 15 para desenvolvimento local
```

> **Atenção:** este repositório é um monorepo sem `package.json` na raiz. Todos os comandos `npm` e `npx` devem ser executados de dentro de `web/` ou de `whatsapp/`.

---

## 🔧 Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Aplicação Web (`web/`)** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), TypeScript 5 |
| **Estilização & UI** | [Tailwind CSS v4](https://tailwindcss.com/), CSS Variables Design System (`design-system.css`), [Framer Motion](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/) |
| **Formulários & Validação** | React Hook Form, Zod v4 |
| **Banco de Dados & ORM** | PostgreSQL 15 / [Neon Serverless](https://neon.tech/), [Drizzle ORM](https://orm.drizzle.team/) (`node-postgres`) |
| **Autenticação** | [Auth.js / NextAuth v4](https://next-auth.js.org/) (JWT + Credentials com login duplo: e-mail ou usuário+igreja) |
| **Inteligência Artificial** | Provedores compatíveis com OpenAI / Groq / Google Gemini com *Tool Calling* tipado |
| **Serviço WhatsApp (`whatsapp/`)** | Node.js (ESM + `tsx`), [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys), Express 5, `qrcode`, `pg` |

---

## 📦 Como Instalar e Rodar

### Pré-requisitos
- **Node.js 20+** (recomendado Node 20 ou 22 LTS)
- **Docker** e **Docker Compose** (para subir o PostgreSQL local)
- **Git**

### 1. Clonar o repositório e subir o banco local

Na raiz do projeto:

```bash
git clone https://github.com/CristianSbarboza/scale-flow.git
cd scale-flow

# Sobe o PostgreSQL 15 local na porta 5432 (usuário: postgres | senha: password | banco: scaleflow)
docker-compose up -d
```

### 2. Configurar e iniciar a aplicação Web (`web/`)

```bash
cd web
npm install
```

Crie o arquivo `web/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow"
NEXTAUTH_SECRET="gere-uma-chave-secreta-local-segura"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Crie as tabelas no banco local recém-iniciado e popule os dados de exemplo:

```bash
# Sincroniza o schema em um banco local vazio
DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx drizzle-kit push

# Cria igrejas, ministérios, setores e contas iniciais de desenvolvimento
DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx tsx src/db/seed.ts

# Inicia o servidor de desenvolvimento
npm run dev
```

Acesse:
- **Site institucional:** `http://localhost:3000`
- **Tela de login:** `http://localhost:3000/login`

> As credenciais geradas para o ambiente local estão definidas em [`web/src/db/seed.ts`](./web/src/db/seed.ts).

### 3. (Opcional) Subir o serviço de lembretes por WhatsApp (`whatsapp/`)

Em outro terminal:

```bash
cd whatsapp
cp .env.example .env
# Ajuste DATABASE_URL no whatsapp/.env apontando para o mesmo banco do web/
npm install

# Roda a suíte de verificações automatizadas (fuso horário, fila, rotas /qr e /health)
npm run check

# Inicia o worker em modo desenvolvimento
npm run dev
```

Abra `http://localhost:3100/qr` para parear um aparelho de teste (**WhatsApp › Aparelhos conectados › Conectar um aparelho**). Use `DRY_RUN=true` no `.env` quando quiser validar os ciclos sem enviar mensagens reais.

### Scripts úteis de verificação e manutenção

| Diretório | Comando | Descrição |
| :--- | :--- | :--- |
| `web/` | `npx tsc --noEmit` | Verifica a tipagem estática de toda a aplicação web. |
| `web/` | `npm run lint` | Executa o ESLint (configuração flat Next.js 16 / React 19). |
| `web/` | `DATABASE_URL="..." npx tsx src/db/apply-migration.ts drizzle/manual/<arquivo>.sql` | Aplica uma migração manual em banco já populado com verificação de contagem de linhas. |
| `web/` | `DATABASE_URL="..." npx tsx src/db/create-church.ts` | Provisiona uma nova igreja e seu administrador inicial via variáveis de ambiente. |
| `whatsapp/` | `npm run typecheck` | Verifica a tipagem estática do worker de WhatsApp. |
| `whatsapp/` | `npm run check` | Executa os testes unitários e de integração local do agendador de lembretes. |

---

## 💡 Como Usar

1. **Estruture a igreja (Admin):** acesse `/login` com e-mail e senha de administrador, cadastre os **Ministérios** em `/admin/ministries`, atribua líderes e configure a chave de IA em **Configurações**.
2. **Monte setores e servos (Líder):** cadastre os setores (ex.: *Fotografia*, *Transmissão*, *Projeção*) e adicione os servos informando o WhatsApp. Envie a **Senha de Primeiro Acesso** gerada pelo sistema e marque com **★** quem for coordenador de setor.
3. **Crie a escala conversando ou pelo painel (Líder / Coordenador):** abra a **Assistente IA (Cale)** ou a tela de **Escalas**, gere as datas do mês (adicionando títulos especiais como *Santa Ceia* se desejar) e vire a chave **Situação** para **Publicada**.
4. **Colha disponibilidades e escale a equipe:** compartilhe o link `/escala/[link]` (ou deixe os servos marcarem pela aba **Próxima**), distribua os escalados por culto e exporte o **PDF** final se quiser fixar no mural/grupo.
5. **Deixe a rotina rodar em paz:** os servos consultam seus dias no **Calendário**, resolvem imprevistos pelo **Sino de Trocas** e recebem lembretes automáticos pelo **WhatsApp**.

---

## 🚀 Deploy em Produção

- **Aplicação Web (`web/`):** projetada para deploy na **Vercel** (configurando **Root Directory** como `web`) conectada a um banco PostgreSQL gerenciado (**Neon**).
- **Serviço de WhatsApp (`whatsapp/`):** como o Baileys mantém conexão WebSocket persistente e grava credenciais em disco (`SESSION_DIR`), deve rodar em um host sempre ligado (ex.: **AWS EC2 / VPS Linux**) gerenciado por **PM2**, apontando para o mesmo `DATABASE_URL`. Recomenda-se acessar a porta `3100` (`/qr` e `/health`) via túnel SSH (`ssh -L 3100:localhost:3100 usuario@ip-da-vps`) sem expô-la publicamente. Veja detalhes em [`whatsapp/README.md`](./whatsapp/README.md).

---

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Este projeto adota **Spec-Driven Development (SDD)** para manter consistência arquitetural e visual.

1. Leia as diretrizes em [`specs/README.md`](./specs/README.md) e as regras inegociáveis na [`specs/constitution.md`](./specs/constitution.md) (uso estrito de tokens semânticos do Design System, isolamento por `churchId` e zero dados fictícios em produção).
2. Abra uma **Issue** descrevendo o bug ou a melhoria proposta (para novas funcionalidades, estruture a especificação a partir de [`specs/templates/`](./specs/templates/)).
3. Faça um **Fork** do repositório e crie uma branch descritiva:
   ```bash
   git checkout -b feat/minha-funcionalidade
   ```
4. Garanta que `npx tsc --noEmit` e `npm run lint` (em `web/`) e `npm run check` (em `whatsapp/`) passem sem erros.
5. Faça commits claros seguindo o padrão do projeto em português (`feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`) e abra um **Pull Request**.

---

## 📄 Licença e Créditos

Distribuído para uso e evolução contínua pela equipe **FlowIntic / ScaleFlow**. Consulte o responsável pelo repositório antes de redistribuir comercialmente.

- Estrutura deste `README.md` inspirada no guia [*LEIA-ME ou te devoro: Como escrever um bom README*](https://dev.to/github/leia-me-ou-te-devoro-como-escrever-um-bom-readme-5hl4) (GitHub Brasil / Pachi Parra).

---

<div align="center">
  Desenvolvido com ❤️ para servir à igreja local — menos tempo cobrando presença, mais tempo cuidando de pessoas.
</div>
