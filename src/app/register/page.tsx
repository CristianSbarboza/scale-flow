"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { registerUser } from "@/lib/actions/account";
import AuthCard from "@/components/ui/AuthCard";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <AuthCard subtitle="Crie sua conta administrativa">
      <form onSubmit={handleSubmit} className="grid gap-6">
        <Field
          label="Nome Completo"
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Field
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordField
          label="Confirmar Senha"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-4">
          {loading ? "Cadastrando..." : "Cadastrar"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Entre aqui
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
