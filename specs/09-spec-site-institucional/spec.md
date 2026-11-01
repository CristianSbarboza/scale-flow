# 09 - Site Institucional & Landing Page SEO (`/`)

> **Status:** implementado (31/10/2026).
> **Depende de:** [03-spec-multi-igreja](../03-spec-multi-igreja/spec.md), [05-spec-whatsapp-lembretes](../05-spec-whatsapp-lembretes/spec.md), [07-spec-assistente-ia](../07-spec-assistente-ia/spec.md), [08-spec-desativar-entidades](../08-spec-desativar-entidades/spec.md).

## 📝 Descrição Geral

Transforma a rota raiz pública (`/`) do ScaleFlow no **site institucional oficial** do produto, aproveitando a renderização estática (SSG) e as APIs nativas de metadados do **Next.js 16** para indexação máxima em mecanismos de busca (SEO) e pré-visualização rica em redes sociais/WhatsApp.

A direção estética e estrutural segue o modelo editorial interativo inspirado em [twodo.design](https://twodo.design/) (*Warm Evening Editorial + Live Interactive Stage*), traduzido integralmente para a identidade, tipografia e tokens semânticos do ScaleFlow definidos em [`design-system.css`](../../web/src/styles/design-system.css).

Para preservar o comportamento de quem abre o aplicativo instalado na tela inicial do celular (PWA), o redirecionamento automático por papel (`admin`/`leader` → `/admin`, `servant` → `/servant`, visitante → `/login`) passa a viver na rota dedicada `/entrar`, referenciada em `manifest.ts`.

## 👥 Personas Envolvidas

- **Visitante / Pastor / Líder de Ministério:** Conhece o ScaleFlow pelo Google ou por indicação, entende a proposta de valor em segundos, explora como cada um dos **3 perfis de acesso** (`Administrador`, `Líder de Ministério`, `Servo`) e o diferencial **Servo Coordenador** funcionam na prática pelo celular interativo e acessa o sistema.
- **Servo / Líder já cadastrado:** Ao visitar `/`, encontra no cabeçalho o atalho direto `"Abrir painel ↗"` para sua área autenticada; ao abrir pelo ícone instalado do PWA (`/entrar`), continua caindo direto no painel sem passar pela página institucional.
- **Mecanismos de Busca & Crawlers Sociais (Googlebot, WhatsApp, etc.):** Recebem HTML estático semântico em português (`pt-BR`), dados estruturados JSON-LD (`SoftwareApplication` e `FAQPage`), `sitemap.xml`, `robots.txt` e imagem OpenGraph (`1200x630`).

## 🎯 Requisitos Funcionais (User Stories)

- [x] **RF01 - Narrativa Editorial em Duas Colunas (Scrollytelling):** Como visitante, quero ler a história de como o ScaleFlow resolve o desgaste das escalas ministeriais na coluna esquerda enquanto acompanho cada perfil e cada etapa acontecendo ao vivo em um celular interativo fixo na coluna direita (e logo abaixo do Hero no mobile).
- [x] **RF02 - Seção dos 3 Perfis e Diferencial Servo Coordenador (`#perfis`):** Como visitante, quero entender e simular fielmente os 3 perfis reais do ScaleFlow (`Administrador`, `Líder de Ministério` e `Servo`) além do diferencial do `Servo Coordenador` (servo com `isCoordinator = true` que ganha a 5ª aba `Gestão` em `/servant` para publicar, filtrar e duplicar escalas entre os setores que coordena).
- [x] **RF03 - Protótipo Interativo Vivo Fiel ao Sistema:** Como visitante, quero alternar no topo do celular entre `Admin`, `Líder`, `Servo` e `Coord. ★` — com cabeçalho e barra inferior idênticos aos componentes reais (`AdminSidebar`, `ServantShell`, `ServantHome`, `NotificationBell` e `CoordinatorSchedulePanel`), sem bordas giratórias/radar — ou deixar que a rolagem por `#perfis` e `#momentos` conduza o aparelho automaticamente.
- [x] **RF04 - Perguntas Frequentes Indexáveis (`#faq`):** Como líder avaliando a ferramenta, quero tirar dúvidas reais sobre diferenças entre perfis, WhatsApp, múltiplos ministérios/líderes, uso pelos servos sem instalar loja e funcionamento da IA Cale.
- [x] **RF05 - Alternância de Tema e CTA Inteligente de Sessão:** Como usuário, quero alternar entre modo escuro (padrão noturno quente) e modo claro na barra superior, e ver `"Abrir painel ↗"` caso já esteja autenticado ou `"Entrar no app ↗"` caso seja visitante.
- [x] **RF06 - Preservação do Fluxo PWA (`/entrar`):** Como usuário com o PWA instalado no celular, quero que o `start_url` do manifesto abra diretamente minha área logada (`/admin` ou `/servant`) ou `/login`.

## 🚫 Requisitos Não-Funcionais & Restrições

- [x] **RNF01 - SEO Técnico Completo (Next.js 16):** Rota `/` 100% pré-renderizada estaticamente (sem leitura de cookies/sessão no servidor na página raiz), `metadata` canônica, OpenGraph `pt_BR`, Twitter Card `summary_large_image`, imagem gerada em `/opengraph-image`, JSON-LD (`SoftwareApplication` + `FAQPage`), `/sitemap.xml` e `/robots.txt` bloqueando rotas privadas (`/admin/`, `/servant/`, `/escala/`, `/api/`, `/entrar`).
- [x] **RNF02 - Fidelidade ao Design System & Constituição:** Uso exclusivo das variáveis CSS semânticas de `src/styles/design-system.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--success`, `--destructive`, `--card`, `--card-border`, `--muted`, `--muted-foreground`), sem cores utilitárias cruas do Tailwind e com suporte nativo a `.dark` e `.light`.
- [x] **RNF03 - Acessibilidade & Movimento Consciente:** Contraste mínimo WCAG AA nos textos, navegação por teclado (`skip link`, `<details>` nativos, `aria-pressed` e `aria-live`), cartões estáticos limpos (sem animações giratórias de borda) e respeito integral a `prefers-reduced-motion`.
- [x] **RNF04 - Tipografia Editorial Otimizada:** Carregamento via `next/font/google` (`Fraunces` para títulos editoriais em destaque, `Montserrat` para interface/corpo, `IBM Plex Mono` para rótulos numerados/tags técnicas e `Offside` para a wordmark ScaleFlow), sem layout shift (CLS zero).

## 🏆 Critérios de Aceitação (Definition of Done)

1. [x] Acessar `/` exibe o site institucional completo em modo escuro quente por padrão, com alternância funcional para o modo claro.
2. [x] Rolar pelos 4 cartões de `#perfis` (`Administrador`, `Líder de Ministério`, `Servo` e `Servo Coordenador`) e pelos 6 capítulos de `#momentos` — ou clicar nos botões de simulação / seletor superior do celular — atualiza o protótipo interativo com cabeçalhos, abas e ações fiéis ao aplicativo real.
3. [x] `/robots.txt`, `/sitemap.xml` e `/opengraph-image` respondem corretamente e os scripts `application/ld+json` são emitidos no HTML inicial de `/`.
4. [x] `/entrar` redireciona usuários autenticados para `/admin` ou `/servant` e visitantes para `/login`, sendo usado como `start_url` em `manifest.ts`.
5. [x] `npx tsc --noEmit` e `npx eslint` passam em `web/` sem erros nem avisos de classes não-canônicas.

## 🎨 Interface & UX

- **Direção Estética:** *Warm Evening Editorial Scrollytelling* (inspirada na estrutura narrativa e tipográfica de `twodo.design`, vestida com a paleta laranja/carvão quente/papel do ScaleFlow).
- **Fluxo da Página:**
  1. Barra superior translúcida (`ScaleFlow` + âncoras `#ideia`, `#perfis`, `#momentos`, `#faq` + seletor de tema + CTA de acesso).
  2. Grid responsivo (`lg:grid-cols-12`): Hero + celular vertical alto logo abaixo no mobile e `sticky` à direita durante toda a leitura no desktop + narrativa esquerda com `01 A ideia`, `02 Três perfis e um diferencial` e `03 Seis momentos`.
  3. Seção `04 Perguntas frequentes` + Rodapé editorial de encerramento.
