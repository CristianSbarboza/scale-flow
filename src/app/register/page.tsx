"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { registerUser } from "@/lib/actions/account";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cadastro cria conta de admin: só admin autenticado pode acessar esta tela.
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.replace("/login");
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      await registerUser(name, email, password);
      router.push("/login?registered=true");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erro ao realizar cadastro.");
      setLoading(false);
    }
  };

  if (status !== "authenticated" || session?.user.role !== "admin") {
    return null;
  }

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
          <p style={{ color: 'var(--muted-foreground)' }}>Crie sua conta administrativa</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label htmlFor="name">Nome Completo</label>
            <input 
              id="name"
              type="text" 
              className="input" 
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              className="input" 
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label htmlFor="confirmPassword">Confirmar Senha</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"} 
                className="input" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  padding: '0.25rem'
                }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem', color: 'var(--muted-foreground)' }}>
            Já tem uma conta?{" "}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Entre aqui
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
