"use client";

import { useState, Suspense } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, User, Users, ShieldAlert } from "lucide-react";

type LoginRole = "servant" | "leader" | "admin";

const loginRoles: { value: LoginRole; label: string; icon: typeof User }[] = [
  { value: "servant", label: "Servo", icon: User },
  { value: "leader", label: "Líder", icon: Users },
  { value: "admin", label: "Admin", icon: ShieldAlert },
];

function LoginForm() {
  const [role, setRole] = useState<LoginRole>("servant");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  // Só caminho interno: um callbackUrl absoluto viraria open redirect.
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")
    ? rawCallbackUrl
    : null;
  const isServant = role === "servant";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username: isServant ? identifier : "",
      email: isServant ? "" : identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciais inválidas. Tente novamente.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const sessionRole = session?.user.role;

    if (sessionRole !== role) {
      await signOut({ redirect: false });
      const selected = loginRoles.find(r => r.value === role)?.label;
      setError(`Essas credenciais não pertencem a uma conta de ${selected}.`);
      setLoading(false);
      return;
    }

    router.push(callbackUrl ?? (sessionRole === "servant" ? "/servant" : "/admin"));
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#ea580c,#000000)] light:bg-[radial-gradient(circle_at_top_left,#fff7ed,#f3f4f6)]">
      <div className="card glass animate-fade-in w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-logo text-[2.5rem] tracking-[2px] text-primary">
            ScaleFlow
          </h1>
          <p className="text-muted-foreground">Gestão de Escalas Ministeriais</p>
        </div>

        {registered && (
          <div className="mb-6 rounded-lg border border-success bg-success/10 p-3 text-center text-sm text-success">
            Cadastro realizado com sucesso! Faça login abaixo.
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
          {loginRoles.map((r) => {
            const isActive = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setError(""); setIdentifier(""); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-0.25rem)] p-2 text-[0.8125rem] font-semibold transition-all ${
                  isActive ? "bg-primary text-white" : "bg-transparent text-muted-foreground"
                }`}
              >
                <r.icon size={16} />
                {r.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="identifier">{isServant ? "Usuário" : "E-mail"}</label>
            <input
              id="identifier"
              type={isServant ? "text" : "email"}
              className="input"
              placeholder={isServant ? "seu.usuario" : "seu@email.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="password">Senha</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-4"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta? Peça o acesso ao líder do seu ministério.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
