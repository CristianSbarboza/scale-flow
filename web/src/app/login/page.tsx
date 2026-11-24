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
  const authError = searchParams.get("error");
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

        {authError === "GoogleNotLinked" && (
          <Alert tone="destructive" className="mb-6 text-center">
            Esta conta Google ainda não está vinculada. Entre primeiro com seu
            usuário e senha e conecte o Google em Configurações.
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          className="mb-6 w-full"
          onClick={() =>
            signIn("google", { callbackUrl: callbackUrl ?? "/entrar" })
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
            />
          </svg>
          Entrar com Google
        </Button>

        <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>ou com usuário / e-mail</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
