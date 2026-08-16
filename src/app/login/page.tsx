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
    <div className="login-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
    }}>
      <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontFamily: 'var(--font-logo)', 
            color: 'var(--primary)',
            letterSpacing: '2px',
            marginBottom: '0.5rem'
          }}>
            ScaleFlow
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Gestão de Escalas Ministeriais</p>
        </div>

        {registered && (
          <div style={{ 
            padding: '0.75rem', 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid #10b981', 
            borderRadius: 'var(--radius)', 
            color: '#10b981', 
            fontSize: '0.875rem', 
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            Cadastro realizado com sucesso! Faça login abaixo.
          </div>
        )}

        <div className="flex items-center gap-4" style={{
          gap: '0.5rem',
          padding: '0.375rem',
          borderRadius: 'var(--radius)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '1.5rem',
        }}>
          {loginRoles.map((r) => {
            const isActive = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setError(""); setIdentifier(""); }}
                className="flex items-center gap-4"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem',
                  borderRadius: 'calc(var(--radius) - 0.25rem)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--muted-foreground)',
                }}
              >
                <r.icon size={16} />
                {r.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
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

          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                className="input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem', color: 'var(--muted-foreground)' }}>
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
