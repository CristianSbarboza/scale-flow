# Plano Técnico - Site Institucional & Landing Page SEO (`/`)

> [!IMPORTANT]
> Este documento traduz a especificação `09-spec-site-institucional` em etapas técnicas concretas, respeitando Next.js 16, React 19, Tailwind CSS v4 e o Design System do ScaleFlow.

## 🛠️ Arquitetura & Modelo de Dados

### Alterações de Banco de Dados (Drizzle Schemas)
Nenhuma alteração de banco de dados é necessária. A página institucional em `/` é 100% estática e desacoplada do PostgreSQL para garantir tempo de resposta imediato (TTFB mínimo), resiliência e indexação limpa por motores de busca.

### Novas Rotas & Convenções de Metadados
- **Frontend Routes:**
  - `/` (`web/src/app/page.tsx`): Site institucional público pré-renderizado com JSON-LD (`SoftwareApplication` + `FAQPage`) e metadados SEO.
  - `/entrar` (`web/src/app/entrar/page.tsx`): Despachante de sessão (antigo comportamento de `/`), redirecionando para `/admin`, `/servant` ou `/login`. Usado como `start_url` no PWA.
- **Metadata File Conventions (Next.js 16 App Router):**
  - `/robots.txt` (`web/src/app/robots.ts`): Libera `/` e `/login`; bloqueia `/admin/`, `/servant/`, `/escala/`, `/api/` e `/entrar`.
  - `/sitemap.xml` (`web/src/app/sitemap.ts`): Lista as páginas públicas indexáveis (`/` e `/login`).
  - `/opengraph-image` (`web/src/app/opengraph-image.tsx`): Gera imagem social `1200x630` em PNG com `ImageResponse` (`next/og`).

---

## 📋 Lista de Tarefas (Checklist de Implementação)

### Fase 1: Tipografia, Tokens & Rota PWA
- [x] Configurar fontes `Fraunces` (`--font-display`) e `IBM_Plex_Mono` (`--font-mono`) via `next/font/google` em `web/src/app/layout.tsx`, além de `metadataBase` centralizado em `web/src/lib/site-url.ts`.
- [x] Expor `--font-display` e `--font-mono` no bloco `@theme inline` de `web/src/styles/design-system.css` e adicionar a textura sutil `.editorial-grain` (sem animações giratórias de borda).
- [x] Criar `web/src/app/entrar/page.tsx` com o redirecionamento baseado em sessão e atualizar `start_url: "/entrar"` em `web/src/app/manifest.ts`.

### Fase 2: Infraestrutura de SEO
- [x] Criar `web/src/lib/site-url.ts` para resolver a URL base canônica do ambiente (`NEXT_PUBLIC_APP_URL` / `VERCEL_PROJECT_PRODUCTION_URL` / `NEXTAUTH_URL`).
- [x] Implementar `web/src/app/robots.ts` protegendo rotas internas e links de escalas.
- [x] Implementar `web/src/app/sitemap.ts`.
- [x] Implementar `web/src/app/opengraph-image.tsx` com a identidade visual noturna quente do ScaleFlow.

### Fase 3: Componentes da Página Institucional (`/src/components/landing/`)
- [x] Criar `web/src/components/landing/landing-data.ts` com o conteúdo estruturado (princípios, `PROFILE_CARDS` cobrindo Administrador, Líder de Ministério, Servo e o diferencial Servo Coordenador, `MOMENTS`, FAQs e schemas JSON-LD).
- [x] Criar `web/src/components/landing/LandingHeader.tsx` com skip-link, navegação âncora (`#ideia`, `#perfis`, `#momentos`, `#faq`), alternância de tema (`dark`/`light`) e CTA sensível à sessão (`useSession`).
- [x] Criar `web/src/components/landing/InteractivePhoneStage.tsx` simulando fielmente os 3 perfis + diferencial Servo Coordenador (`Admin` com Visão Geral/Ministérios/Configurações, `Líder` com Geral/Servos/Coordenador ★/Escalas/Assistente, `Servo` com Calendário/Atual/Próxima/Todas/Sino de Trocas/Cale/WhatsApp e `Coord. ★` adicionando a 5ª aba `Gestão` com filtro de setores, chave Publicada/Rascunho e Duplicar).
- [x] Criar `web/src/components/landing/LandingScrollytelling.tsx` conectando Hero, seção `01 A ideia`, seção `02 Três perfis e um diferencial`, os 6 capítulos de `03 Seis momentos` (`IntersectionObserver`) e o celular alto e `sticky`.
- [x] Criar `web/src/components/landing/LandingFaqAndFooter.tsx` (`04 Perguntas frequentes` com `<details>` semânticos e rodapé editorial com frase de impacto).
- [x] Atualizar `web/src/app/page.tsx` compondo a landing page completa com `Metadata` e `<script type="application/ld+json">`.

### Fase 4: Polimento & Validação
- [x] Revisar todas as classes Tailwind v4 para garantir formas canônicas e uso estrito de tokens semânticos.
- [x] Validar compilação TypeScript (`npx tsc --noEmit`) e ESLint em `web/`.
- [x] Preencher `validation.md`.
