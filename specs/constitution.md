# Constituição do Projeto - ScaleFlow

Esta é a constituição do ScaleFlow. Ela serve como a fonte de verdade absoluta para decisões de design, padrões de código, restrições tecnológicas e diretrizes de arquitetura. Qualquer nova especificação ou alteração de código **deve** obedecer a estas regras.

---

## 🛠️ Stack Tecnológica & Restrições

1. **Framework Principal:** Next.js 16 (App Router) + React 19 + TypeScript.
   > [!WARNING]
   > Esta versão do Next.js (v16) e React (v19) possui mudanças significativas em APIs e convenções em relação a versões anteriores. Sempre verifique as diretrizes locais em caso de deprecações.
2. **Estilização:** Tailwind CSS v4 + Design System Customizado.
   - Os tokens principais e variáveis globais estão definidos em `src/styles/design-system.css`.
   - Use utilitários do Tailwind v4 de forma harmoniosa com os tokens do projeto. Evite cores genéricas (`bg-red-500`, `text-blue-600`). Use cores semânticas e consistentes com a paleta premium do app.
3. **Banco de Dados & ORM:** PostgreSQL com Drizzle ORM (`drizzle-kit`).
   - Todos os esquemas de tabelas devem ser declarados no diretório apropriado e sincronizados via migrations ou `drizzle-kit push`.
4. **Autenticação:** Auth.js (NextAuth.js v4).
5. **Animações:** Framer Motion para micro-interações e transições fluidas.
6. **Componentes & Ícones:** Lucide React para iconografia.

---

## 🎨 Princípios de Design & UI/UX

1. **Aparência Premium (Wow Factor):** O ScaleFlow deve ter um visual extremamente polido. Use gradientes suaves, efeitos de vidro (glassmorphic), sombras sutis e cores do sistema de design.
2. **Design Dinâmico & Responsivo:** Layouts fluidos (mobile-first), com estados de foco, hover ativos, animações de transição suaves e feedback tátil/visual para ações do usuário.
3. **Sem Placeholders:** Não use placeholders visuais em produção. Imagens reais ou ilustrações vetorizadas premium geradas por IA devem ser integradas.
4. **Modo Escuro nativo:** Garanta que todas as novas telas e componentes funcionem e fiquem excelentes em temas escuros e claros usando as variáveis semânticas do projeto.

---

## 📂 Diretrizes de Estrutura de Pastas

Toda implementação deve seguir a estrutura padrão do Next.js App Router:
- `/src/app/`: Rotas, páginas e layouts.
- `/src/components/`: Componentes React reutilizáveis e modulares.
- `/src/db/`: Esquemas de banco de dados, sementes (seeds) e conexões.
- `/src/styles/`: Arquivos CSS globais e tokens de design.
- `/src/types/`: Tipos e interfaces TypeScript globais.
- `/specs/`: Especificações e documentações SDD.

---

## 🤖 Diretrizes Especiais para Agentes de IA

Ao atuar no desenvolvimento do ScaleFlow, os agentes devem:
1. **Verificar os Esquemas de Banco de Dados:** Nunca assuma a estrutura das tabelas. Sempre leia os arquivos sob `/src/db/` antes de criar queries.
2. **Evitar Código Duplicado:** Verifique se componentes como botões, modais, cards de escala ou feedbacks de loading já existem no projeto antes de criar novos.
3. **Documentar Alterações:** Toda alteração de escopo, banco de dados ou novas rotas deve ser atualizada no arquivo `tasks.md` e `validation.md` da spec correspondente.
