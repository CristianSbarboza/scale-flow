"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectItem {
  value: string;
  label: string;
  /**
   * Texto curto para o gatilho, quando o rótulo completo não cabe.
   * Ex.: a lista mostra "🇧🇷 +55 Brasil" e o gatilho, só "🇧🇷 +55".
   * Sem isto, seletor estreito trunca o rótulo e some justamente com a parte
   * que identifica a opção.
   */
  short?: string;
}

/**
 * Seletor com dropdown próprio.
 *
 * O `<select>` nativo desenha a lista com o estilo do sistema operacional, que
 * não aceita CSS — por isso os filtros abriam uma caixa branca genérica no meio
 * do tema escuro. Aqui a lista é um listbox nosso, com os tokens do design
 * system.
 *
 * O que se ganha em aparência se paga em acessibilidade escrita à mão, então
 * está tudo aqui: papéis ARIA, seta para navegar, Enter para escolher, Escape
 * para fechar, Home/End para as pontas, e foco de volta no gatilho ao fechar.
 */
export default function Select({
  value,
  onChange,
  options,
  label,
  leading,
  className,
  listClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectItem[];
  /** Nome do campo para leitores de tela. Não aparece na tela. */
  label: string;
  /** Ícone à esquerda, dentro do gatilho. */
  leading?: React.ReactNode;
  className?: string;
  /**
   * Classes da lista aberta. Serve para soltar a largura quando o gatilho é
   * estreito: por padrão a lista acompanha o gatilho, e num seletor de 116px
   * isso truncaria justamente o texto que diferencia as opções.
   */
  listClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Mantém a opção ativa visível quando se navega pelo teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-opt-${activeIndex}`)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, id]);

  const abrir = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const escolher = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        escolher(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn("relative flex-[1_1_160px]", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border bg-muted px-3 py-2.5 text-left text-sm transition-colors",
          open ? "border-primary" : "border-border hover:border-muted-foreground",
        )}
      >
        {leading}
        <span className="flex-1 truncate">{selected?.short ?? selected?.label}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg",
            listClassName,
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => escolher(i)}
                onPointerEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm",
                  i === activeIndex && "bg-muted",
                  isSelected && "text-primary",
                )}
              >
                <Check size={14} className={cn("shrink-0", !isSelected && "opacity-0")} />
                <span className="truncate">{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
