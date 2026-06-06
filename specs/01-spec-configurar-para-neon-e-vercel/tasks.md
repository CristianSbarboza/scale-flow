# Plano Técnico - Configuração de Neon e Deploy na Vercel

> [!IMPORTANT]
> Este plano detalha as tarefas técnicas necessárias para configurar a conexão com o Neon Serverless Postgres e realizar o deploy do ScaleFlow na Vercel.

## 🛠️ Arquitetura & Variáveis de Ambiente

### Variáveis de Ambiente Necessárias (.env / Vercel Dashboard)
Para o correto funcionamento do banco de dados remoto e da autenticação em produção:

| Variável | Descrição | Exemplo / Valor |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão PostgreSQL do Neon com pooling ativado. | `postgres://[user]:[password]@[neon-host]-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_SECRET` | Chave secreta usada pelo NextAuth para criptografar tokens. | Gerar via terminal: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL base do app em produção (necessária para NextAuth v4). | `https://scaleflow.vercel.app` (ou domínio próprio) |

> [!TIP]
> A Neon fornece duas strings de conexão: uma direta e outra com pooling (geralmente contendo `-pooler` no host). **Sempre use a com pooling** no Vercel para evitar o erro `remaining connection slots are reserved` decorrente do comportamento de Serverless Functions.

---

## 📋 Lista de Tarefas (Checklist de Implementação)

Marque o progresso usando:
- `[ ]` para tarefas pendentes.
- `[/]` para tarefas em andamento.
- `[x]` para tarefas concluídas.

### Fase 1: Configuração do Banco de Dados no Neon
- [ ] Criar conta no [Neon Console](https://neon.tech/) e iniciar um novo projeto PostgreSQL (versão 16 recomendada).
- [ ] Obter a connection string com **pooling** habilitado no dashboard do Neon.
- [ ] Atualizar temporariamente o arquivo `.env` local com a nova `DATABASE_URL` do Neon para testes.
- [ ] Testar a conexão rodando o push de schemas do Drizzle:
  ```bash
  npx drizzle-kit push
  ```
- [ ] Rodar o script de semente (seed) para cadastrar o usuário administrador padrão no Neon:
  ```bash
  npx tsx src/db/seed.ts
  ```

### Fase 2: Ajuste de Conectores no Next.js (se necessário)
- [ ] Verificar se `src/db/index.ts` está utilizando `sslmode=require` na URL de conexão ou se o pool de conexões do `pg` inicializa corretamente.
- [ ] Garantir que o Drizzle Kit em `drizzle.config.ts` lê `process.env.DATABASE_URL` corretamente.

### Fase 3: Preparação do Deploy na Vercel
- [ ] Conectar o repositório git do ScaleFlow na Vercel.
- [ ] Configurar as variáveis de ambiente (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) nas configurações do projeto na Vercel.
- [ ] Garantir que as configurações de build na Vercel estejam corretas:
  - Framework Preset: **Next.js**
  - Build Command: `npm run build`
  - Output Directory: `.next`

### Fase 4: Validação em Produção
- [ ] Executar o deploy inicial na Vercel.
- [ ] Verificar os logs de build e runtime no painel da Vercel para rastrear possíveis erros de conexão com banco ou NextAuth.
- [ ] Acessar a URL de produção gerada pela Vercel e validar o login com `admin@scaleflow.com` / `admin123`.
