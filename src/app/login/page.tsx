"use client";

import { useState, Suspense } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Users, ShieldAlert } from "lucide-react";
import Alert from "@/components/ui/Alert";
import AuthCard from "@/components/ui/AuthCard";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";
import SegmentedControl, { type SegmentedOption } from "@/components/ui/SegmentedControl";

type LoginRole = "servant" | "leader" | "admin";

const loginRoles: readonly SegmentedOption<LoginRole>[] = [
  { value: "servant", label: "Servo", icon: User },
  { value: "leader", label: "Líder", icon: Users },
  { value: "admin", label: "Admin", icon: ShieldAlert },
];

function LoginForm() {
  const [role, setRole] = useState<LoginRole>("servant");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
    <AuthCard subtitle="Gestão de Escalas Ministeriais">
      {registered && (
        <Alert tone="success" className="mb-6 text-center">
          Cadastro realizado com sucesso! Faça login abaixo.
        </Alert>
      )}

      <SegmentedControl
        className="mb-6"
        options={loginRoles}
        value={role}
        onChange={(next) => { setRole(next); setError(""); setIdentifier(""); }}
      />

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Field
          label={isServant ? "Usuário" : "E-mail"}
          type={isServant ? "text" : "email"}
          placeholder={isServant ? "seu.usuario" : "seu@email.com"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <PasswordField
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-4">
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem uma conta? Peça o acesso ao líder do seu ministério.
        </p>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
