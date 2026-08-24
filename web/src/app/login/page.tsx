"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";

/**
 * Um campo que entra na tela.
 *
 * Uma vez revelado, o campo não some enquanto o que o revelou continuar
 * valendo: esconder de volta ao apagar o que foi digitado faria a tela pular
 * no meio da correção de um erro de digitação, que é exatamente a hora em que
 * a pessoa menos quer o layout se mexendo.
 *
 * Anima opacidade e deslocamento, **não altura**. Animar altura exigiria
 * `overflow: hidden`, e aí o anel de foco laranja — que se estende 2px para
 * fora do input — apareceria cortado nas laterais. Quem cuida do empurrão dos
 * campos de baixo é o `layout`: eles deslizam para a nova posição.
 */
function Reveal({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <motion.div
      // A ref precisa chegar no motion.div: o `popLayout` do AnimatePresence
      // clona este filho com uma ref para medir o elemento antes de tirá-lo do
      // fluxo. Se a ref não chegar, ele desiste **em silêncio** e a saída volta
      // a ocupar espaço. (React 19: ref é prop comum, não precisa de forwardRef.)
      ref={ref}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.12 } }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="pt-6"
    >
      {children}
    </motion.div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  // Só caminho interno: um callbackUrl absoluto viraria open redirect.
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")
    ? rawCallbackUrl
    : null;

  // `?igreja=` pré-preenche o campo. O link que o admin manda para os servos
  // já vem com ele, então na prática quase ninguém digita a igreja na mão.
  const initialChurch = searchParams.get("igreja")?.trim().toLowerCase() ?? "";

  const [identifier, setIdentifier] = useState("");
  const [church, setChurch] = useState(initialChurch);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(
    () => new Set(initialChurch ? ["church"] : [])
  );

  const reveal = (name: string) =>
    setRevealed((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));

  /**
   * O `@` decide o caminho, e é por isso que não há mais abas.
   *
   * Quem tem e-mail entra por e-mail — inclusive servo, que pode ter e-mail
   * cadastrado. Quem tem só usuário precisa dizer de qual igreja é, porque
   * `maria` só é única dentro de uma igreja.
   */
  const isEmail = identifier.includes("@");
  const showChurch = revealed.has("church") && !isEmail;
  const showPassword = revealed.has("password");

  /** Campo que acabou de ser revelado por um avanço, para receber o foco. */
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  /**
   * Avança para o próximo campo. Só por ação explícita: o botão "Próximo" ou
   * Enter.
   *
   * **Não avança no blur**, e isso é deliberado. O blur dispara antes do
   * clique: ao clicar em "Próximo", o campo perderia o foco, o botão sumiria
   * por baixo do cursor e o clique nunca chegaria. Pior no teclado — dar Tab
   * até o botão o faria desaparecer no caminho, jogando o foco no nada.
   *
   * Também não avança a cada tecla: isso faria o campo "Igreja" nascer no
   * primeiro caractere de um e-mail e morrer ao chegar no `@`, piscando a cada
   * login de admin. No avanço explícito já se sabe qual dos dois caminhos é.
   */
  const commitIdentifier = () => {
    if (!identifier.trim()) return;
    const next = isEmail ? "password" : "church";
    setFocusTarget(next);
    reveal(next);
  };

  // O botão some assim que cumpre a função. Deixá-lo depois do avanço seria um
  // controle que não faz mais nada, competindo com o "Entrar" logo abaixo.
  const showNext =
    identifier.trim() !== "" && !revealed.has(isEmail ? "password" : "church");

  const canSubmit =
    identifier.trim() !== "" &&
    password.trim() !== "" &&
    (isEmail || church.trim() !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      church: isEmail ? "" : church.trim().toLowerCase(),
      // Minúsculo nos dois: o teclado do celular capitaliza a primeira letra
      // sozinho, e "Joao.silva" não casaria com o que está gravado.
      username: isEmail ? "" : identifier.trim().toLowerCase(),
      email: isEmail ? identifier.trim().toLowerCase() : "",
      password,
      redirect: false,
    });

    if (result?.error) {
      // Uma mensagem por caminho, cobrindo todos os campos dele (RNF07).
      // Distinguir "igreja não existe" de "senha errada" transformaria esta
      // tela num jeito de descobrir quais igrejas existem e quem serve nelas.
      setError(isEmail
        ? "E-mail ou senha inválidos."
        : "Igreja, usuário ou senha inválidos.");
      setLoading(false);
      return;
    }

    // Sem verificação de papel: não há mais aba para errar. Cada um vai para
    // onde o próprio papel manda — era só a aba que criava o caso de alguém
    // digitar credenciais válidas e ainda assim ser recusado.
    const session = await getSession();
    const isServant = session?.user.role === "servant";
    router.push(callbackUrl ?? (isServant ? "/servant" : "/admin"));
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-10 text-center">
          <Image
            src="/logo-mark.png"
            alt=""
            width={64}
            height={64}
            priority
            className="mx-auto mb-4 rounded-2xl"
          />
          <h1 className="font-logo text-[2.75rem] leading-none tracking-[2px] text-primary">
            ScaleFlow
          </h1>
        </div>

        {registered && (
          <Alert tone="success" className="mb-6 text-center">
            Cadastro realizado com sucesso! Faça login abaixo.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Field
            label="Usuário ou e-mail"
            type="text"
            placeholder="seu.usuario ou seu@email.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              // Sem isto, Enter tenta submeter um formulário que ainda não
              // tem senha — e não acontece nada, que parece a tela travada.
              if (e.key === "Enter") {
                e.preventDefault();
                commitIdentifier();
              }
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            required
          />

          <AnimatePresence initial={false} mode="popLayout">
            {showNext && (
              <Reveal key="next">
                {/* Enter também avança, mas é invisível: sem este botão, quem
                    não tenta o Enter fica olhando para um campo preenchido sem
                    nada para clicar. */}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={commitIdentifier}
                >
                  Próximo
                  <ArrowRight size={18} />
                </Button>
              </Reveal>
            )}

            {showChurch && (
              <Reveal key="church">
                {/* Campo de texto, não lista: uma lista de igrejas entregaria a
                    quem chegasse na tela quais contas existem no sistema. */}
                <Field
                  label="Igreja"
                  type="text"
                  placeholder="nome-da-igreja"
                  value={church}
                  onChange={(e) => {
                    setChurch(e.target.value);
                    if (e.target.value.trim()) reveal("password");
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="organization"
                  hint="O identificador da sua igreja. Peça ao líder se não souber."
                  autoFocus={focusTarget === "church"}
                  required
                />
              </Reveal>
            )}

            {showPassword && (
              <Reveal key="password">
                <PasswordField
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus={focusTarget === "password"}
                  required
                />
              </Reveal>
            )}

            {error && (
              <Reveal key="error">
                <p role="alert" className="text-center text-sm text-destructive">{error}</p>
              </Reveal>
            )}

            {/* O botão acompanha o estado real dos campos: apagar um deles o faz
                sair de novo. Sair não deixa ninguém preso — com a senha
                preenchida, o Enter continua submetendo. */}
            {canSubmit && (
              <Reveal key="submit">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Reveal>
            )}
          </AnimatePresence>

          {/* `layout` também aqui: sem isso esta linha é a única coisa da tela
              que salta quando um campo novo entra acima dela. */}
          <motion.p layout className="mt-8 text-center text-sm text-muted-foreground">
            Não tem uma conta? Peça o acesso ao líder do seu ministério.
          </motion.p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
