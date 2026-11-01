# Plano de Validação & Testes - Site Institucional & Landing Page SEO (`/`)

## 🧪 Testes Automatizados & Verificações Estáticas

- **Comando executado:** `cd web && npx tsc --noEmit`
- **Resultado:** Passou sem erros (exit code `0`).
- **Comando executado:** `cd web && npx eslint src/app/page.tsx src/components/landing/`
- **Resultado:** Passou sem erros nem avisos em todos os arquivos novos e alterados.

---

## 🙋 Validação Manual (Checklist)

### 🖥️ Desktop
- [x] **Fluxo Principal (`/`):** Carrega instantaneamente sem redirecionar para `/login`, exibindo a barra translúcida (`A ideia`, `Perfis`, `Momentos`, `Perguntas`), o Hero em `Fraunces` com destaque em itálico e o protótipo interativo verticalmente alto do celular ao lado, sem nenhuma animação de borda/radar girando.
- [x] **Seção `02 · Três perfis e um diferencial` (`#perfis`):** Apresenta `Administrador`, `Líder de Ministério`, `Servo` e o cartão em destaque `Diferencial · Servo Coordenador`, sincronizando automaticamente o celular ao rolar ou clicar em `"Simular perfil no celular"`.
- [x] **Fidelidade Real no Protótipo Interativo:**
  - **Admin:** Exibe os 4 indicadores (`Ministérios`, `Setores`, `Servos`, `Escalas Ativas`), lista de ministérios multi-líder, chave `Situação` não-destrutiva e Configurações da Igreja & IA.
  - **Líder:** Exibe painel filtrado em um único ministério, gestão de servos com botão `★ Coordenador` e `Switch` de ativação, escalas e assistente Cale.
  - **Servo:** Exibe `ServantShell` com sino `NotificationBell` (ponto vermelho de troca pendente), avatar, Calendário mensal 7 colunas, abas `Calendário`, `Atual`, `Próxima`, `Todas` e botão flutuante da Cale IA.
  - **Servo Coordenador (`Coord. ★`):** Preserva a interface de Servo e acrescenta a 5ª aba `Gestão` com filtro de setores coordenados, `Switch` `Publicada/Rascunho`, `Copiar link` e `Duplicar`.
- [x] **Alternância de Tema:** O botão de tema na barra superior alterna suavemente entre `.dark` (`#1b1a18`) e `.light` (`#ffffff` / `#faf9f7`), mantendo contraste AA em todos os cartões e textos.
- [x] **SEO & Rotas Auxiliares:** `/robots.txt` bloqueia `/admin/`, `/servant/`, `/escala/`, `/api/` e `/entrar`; `/sitemap.xml` lista `/` e `/login`; `/opengraph-image` renderiza o card social `1200x630`; `/entrar` redireciona de acordo com a sessão.

### 📱 Mobile (Responsividade)
- [x] **Layout Responsivo:** Em telas menores, o celular aparece logo após o Hero com altura confortável (`min-h-156 sm:min-h-172`) e sem vazamento horizontal; clicar em `"Simular perfil no celular"` ou `"Simular no celular"` leva suavemente ao aparelho interativo.
- [x] **Usabilidade de Toque:** Seletor de 4 perfis, abas inferiores (4 ou 5 colunas), chaves `Switch` e acordeões de FAQ respeitam área de toque confortável e operam sem hover obrigatório.
