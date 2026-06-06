# 01 - Configuração de Banco de Dados (Neon) e Deploy (Vercel)

> [!NOTE]
> Esta especificação define os requisitos e objetivos para migrar/configurar o banco de dados do ScaleFlow para o Neon (Postgres Serverless) e habilitar o deploy contínuo na Vercel.

## 📝 Descrição Geral
O ScaleFlow utiliza atualmente um banco de dados PostgreSQL rodando localmente (Docker). Para produção e staging, utilizaremos o **Neon** como banco de dados Postgres Serverless devido à sua escalabilidade, ramificações de banco de dados (database branching) e integração nativa com a **Vercel**, onde a aplicação Next.js 16 será hospedada.

Esta tarefa consiste em configurar as variáveis de ambiente, drivers de conexão e scripts de build para garantir que a aplicação conecte corretamente ao Neon e seja compilada/publicada com sucesso na Vercel.

## 👥 Personas Envolvidas
- **Administrador de Infraestrutura / Desenvolvedor:** Precisa configurar o pipeline, variáveis de ambiente e banco de dados.
- **Servos e Administradores do ScaleFlow:** Precisam que a aplicação de produção esteja disponível, estável e com tempo de resposta rápido.

## 🎯 Requisitos Funcionais (User Stories)
- [ ] **RF01 - Conexão Segura com Prod/Staging:** A aplicação deve se conectar ao Neon de forma segura usando SSL obrigatório em produção.
- [ ] **RF02 - Migrações Automáticas ou Semimanuais:** Deve ser possível rodar migrações do Drizzle no banco do Neon a partir do ambiente de desenvolvimento ou durante o processo de build/deploy.
- [ ] **RF03 - Seed de Dados Inicial:** Deve ser possível popular o banco do Neon com os dados iniciais do ADM (`admin@scaleflow.com`).

## 🚫 Requisitos Não-Funcionais & Restrições
- [ ] **RNF01 - Banco de Dados Neon:** O banco de dados deve utilizar o pooler de conexões do Neon (porta 5432/6543) para evitar exaustão de conexões causadas por Serverless Functions da Vercel.
- [ ] **RNF02 - Deploy Vercel:** O build na Vercel deve ser otimizado para Next.js 16 e React 19, garantindo que variáveis de ambiente como `NEXTAUTH_SECRET` e `DATABASE_URL` sejam injetadas com segurança.
- [ ] **RNF03 - Performance:** O driver de banco de dados deve ter baixa latência. Se utilizarmos rotas na Edge, devemos suportar o driver `@neondatabase/serverless` da Neon.

## 🏆 Critérios de Aceitação (Definition of Done)
1. [ ] Banco de dados criado no Neon e esquema sincronizado com sucesso.
2. [ ] Seed inicial executado no Neon, permitindo login com `admin@scaleflow.com`.
3. [ ] Projeto configurado na Vercel com todas as variáveis de ambiente necessárias.
4. [ ] Build concluído com sucesso na Vercel e aplicação online funcional no domínio gerado.
5. [ ] Rotas protegidas pelo NextAuth funcionando corretamente no ambiente de deploy.
