"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Field from "@/components/ui/Field";

/**
 * Campo de senha com o botão de mostrar/ocultar.
 *
 * O par input + botão posicionado estava duplicado em /login e /register,
 * cada um com o seu próprio `position: relative` na mão.
 */
export default function PasswordField({
  label = "Senha",
  ...rest
}: Omit<React.ComponentProps<typeof Field>, "type" | "trailing" | "label"> & {
  label?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...rest}
      label={label}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
}
