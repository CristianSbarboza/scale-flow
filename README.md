# ScaleFlow - Gestão de Escalas Ministeriais

ScaleFlow é um sistema premium desenvolvido para facilitar a gestão de escalas e voluntários em igrejas. Com uma interface moderna, intuitiva e focada na experiência do usuário, o ScaleFlow permite que administradores organizem ministérios, setores e servos de forma eficiente.

## 🚀 Funcionalidades

### Para Administradores (ADM)
- **Gestão Completa:** Cadastro de Ministérios, Setores e Servos.
- **Senhas Automáticas:** Geração de senhas temporárias para o primeiro acesso dos servos.
- **Criação de Escalas:** Definição de datas e horários específicos para eventos ou cultos.
- **Links Compartilháveis:** Geração de links únicos para que os servos informem sua disponibilidade.
- **Dashboard de Visão Geral:** Estatísticas em tempo real sobre a saúde da gestão ministerial.

### Para Servos
- **Disponibilidade Simplificada:** Acesse o link enviado pelo ADM e selecione as datas que você pode servir.
- **Agenda Pessoal:** Login individual para visualizar a agenda do mês com destaque para os dias de serviço confirmados.
- **Interface Premium:** Design elegante com modo escuro e glassmorphism.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [Next.js 14+](https://nextjs.org/) (App Router, TypeScript)
- **Estilização:** Vanilla CSS com Design System personalizado.
- **Banco de Dados:** PostgreSQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Autenticação:** [Auth.js (NextAuth)](https://next-auth.js.org/)
- **Animações:** [Framer Motion](https://www.framer.com/motion/)
- **Ícones:** [Lucide React](https://lucide.dev/)

## 📦 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose

### Instalação

1. Clone o repositório:
   ```bash
   git clone <repo-url>
   cd ScaleFlow
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Suba o banco de dados com Docker:
   ```bash
   docker-compose up -d
   ```

4. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz seguindo o modelo do `.env.example`.

5. Execute as migrações do banco de dados:
   ```bash
   npx drizzle-kit push
   ```

6. Popule o banco com o usuário administrador inicial:
   ```bash
   npx tsx src/db/seed.ts
   ```

7. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

8. Acesse em `http://localhost:3000/login`.

### 🔑 Credenciais de Acesso Inicial

Para o primeiro acesso, utilize:
- **E-mail:** `admin@scaleflow.com`
- **Senha:** `admin123`

## 🎨 Design System

O projeto utiliza um sistema de design baseado em variáveis CSS para garantir consistência e facilidade de manutenção. Os tokens de design estão localizados em `src/styles/design-system.css`.

## ☁️ Hospedagem

O ScaleFlow foi projetado para ser hospedado na **Vercel** com integração nativa ao Next.js e suporte para bancos de dados Postgres (como Vercel Postgres ou Neon).

---
Desenvolvido com ❤️ para servir à comunidade.
