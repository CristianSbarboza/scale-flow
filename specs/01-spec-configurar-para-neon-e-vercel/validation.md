# Plano de Validação & Testes - Configuração Neon & Vercel

> [!NOTE]
> Este plano descreve como validar a configuração do banco de dados remoto no Neon e o deploy do ScaleFlow na Vercel.

## 🧪 Testes de Conectividade e Banco de Dados (Ambiente de Desenvolvimento)

- **Comando de Sincronização do Banco (Drizzle Push):**
  - **Comando:** `npx drizzle-kit push`
  - **Resultado Esperado:** Mensagem informando que os esquemas do banco estão sincronizados (`No schema changes detected` ou aplicação bem-sucedida de tabelas no Neon).
- **Comando de Seed de Dados:**
  - **Comando:** `npx tsx src/db/seed.ts`
  - **Resultado Esperado:** Mensagem indicando inserção com sucesso do usuário ADM inicial.

---

## 💻 Compilação e Linter (Validado Localmente)

- **Comando do Linter:** `npm run lint`
  - **Resultado:** **PASS** (Resolvidos erros anteriores, mantendo apenas 3 avisos inofensivos de variáveis não utilizadas).
- **Comando de Compilação (Next.js Build):** `npm run build`
  - **Resultado:** **PASS** (Compilado com sucesso em ambiente local).

---

## 🙋 Validação Manual (Checklist)

### ☁️ Painel do Neon (Console)
- [ ] **Conexão Estabelecida:** Verificar no painel da Neon se novas conexões foram estabelecidas durante o push e seed.
- [ ] **Esquemas no Neon:** Verificar na aba "Tables" do Neon se todas as tabelas do `schema.ts` (ex: users, scales, ministries, etc.) foram criadas no banco de dados.

### 🌐 Deploy Vercel (Produção)
- [ ] **Sucesso no Build:** O status do deploy na Vercel deve estar marcado como **Ready** (Verde).
- [ ] **Acesso à Página de Login:** Acessar a URL de produção gerada (ex: `https://scaleflow.vercel.app/login`) e validar se a página carrega perfeitamente (Design System, fontes e estilos).
- [ ] **Login de Administrador:** Efetuar login com as credenciais padrão:
  *   **Email:** `admin@scaleflow.com`
  *   **Senha:** `admin123`
- [ ] **Persistência de Sessão (Cookies/NextAuth):** Validar se o usuário é redirecionado corretamente para a dashboard `/admin/dashboard` (ou rota equivalente) e se a sessão se mantém ativa.
- [ ] **Verificação de Logs (Opcional):** Acessar a aba "Logs" do projeto na Vercel e garantir que nenhuma exceção de banco de dados ou erro de criptografia de JWT/NextAuth foi gerado.

---

## 📸 Evidências (Prints / Vídeos)
[Cole abaixo links para imagens ou GIFs demonstrando a funcionalidade operando em ambiente local ou staging.]

*   **Vercel Build Status:** ![Status do Build na Vercel](http://placehold.co/600x200?text=Vercel+Build+Ready)
*   **Login efetuado com sucesso:** ![Dashboard em Produção](http://placehold.co/600x400?text=Dashboard+Producao)
