"use client";

import { useId, useState } from "react";
import FieldShell from "@/components/ui/FieldShell";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  COUNTRIES,
  formatNational,
  getCountry,
  onlyDigits,
  splitPhone,
  toE164,
  validatePhone,
} from "@/lib/phone";

/**
 * Telefone com seletor de país.
 *
 * Fala E.164 para fora (`5511987654321` ou `null`) e cuida sozinho de máscara,
 * país e validação. Quem usa não precisa saber que existe código de país: passa
 * o que veio do banco e recebe o que vai para o banco.
 *
 * O país fica no seletor, não digitado no campo. Se fosse digitado, "11 98765"
 * e "+55 11 98765" gravariam coisas diferentes e ninguém perceberia até a
 * primeira mensagem não chegar.
 */
export default function PhoneField({
  label = "Telefone",
  value,
  onChange,
  hint,
  required,
  className,
}: {
  label?: React.ReactNode;
  /** E.164 sem `+`, ou `null`/`""` quando não há telefone. */
  value: string | null;
  /** Recebe E.164 sem `+`, ou `null` quando o campo está vazio. */
  onChange: (e164: string | null) => void;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  const id = useId();
  const initial = splitPhone(value);

  /**
   * O país vive aqui, não no `value`.
   *
   * Derivá-lo do `value` a cada render apagaria a escolha de quem seleciona
   * Portugal antes de digitar: sem dígitos não há E.164, sem E.164 o
   * `splitPhone` devolve o padrão, e o seletor pularia de volta para o Brasil
   * sozinho.
   */
  const [country, setCountry] = useState(initial.country);
  const [national, setNational] = useState(() => formatNational(initial.country, initial.national));
  const [touched, setTouched] = useState(false);

  const error = touched ? validatePhone(country, national) : null;

  const emit = (nextCountry: string, nextNational: string) => {
    onChange(toE164(nextCountry, nextNational));
  };

  const changeCountry = (next: string) => {
    setCountry(next);
    // Remascara o que já estava digitado: sair do Brasil tira os parênteses,
    // voltar os recoloca. Os dígitos são preservados — trocar de país por
    // engano não pode custar o número inteiro.
    const digits = onlyDigits(national);
    setNational(formatNational(next, digits));
    emit(next, digits);
  };

  const changeNational = (raw: string) => {
    const digits = onlyDigits(raw).slice(0, getCountry(country).maxDigits);
    const masked = formatNational(country, digits);
    setNational(masked);
    emit(country, digits);
  };

  return (
    <FieldShell
      id={`${id}-input`}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="flex gap-2">
        <Select
          value={country}
          onChange={changeCountry}
          // O gatilho mostra bandeira + código; a lista mostra o nome também,
          // senão escolher entre 🇵🇹 351 e 🇵🇾 595 vira adivinhação.
          options={COUNTRIES.map((c) => ({
            value: c.code,
            label: `${c.flag} +${c.code} ${c.name}`,
            short: `${c.flag} +${c.code}`,
          }))}
          label="Código do país"
          // `flex-none` e não `shrink-0`: o padrão do Select é `flex-[1_1_160px]`,
          // e só um utilitário do mesmo grupo o remove no twMerge.
          className="w-[116px] flex-none"
          listClassName="w-max min-w-[220px]"
        />
        <input
          id={`${id}-input`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          // Exemplo do país escolhido, escrito como se digita. Um "número"
          // genérico não diz se são 9 ou 10 dígitos, nem se leva o zero.
          placeholder={getCountry(country).example}
          value={national}
          onChange={(e) => changeNational(e.target.value)}
          onBlur={() => setTouched(true)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-input-error` : undefined}
          className={cn("input min-w-0 flex-1", error && "border-destructive")}
        />
      </div>
    </FieldShell>
  );
}
