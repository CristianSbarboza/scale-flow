"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import SectionLabel from "@/components/ui/SectionLabel";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/cn";

/**
 * Região de exclusão: aviso do que será apagado, campo para digitar o nome, e
 * só então o botão.
 *
 * Duas barreiras porque a ação é irreversível e apaga em cascata. Digitar o
 * nome obriga a olhar **qual** registro está aberto — quem chegou na tela
 * errada não passa daqui. O modal depois confirma a intenção.
 *
 * Componente porque o padrão vale para servo, setor e ministério. Copiado três
 * vezes, a terceira cópia esqueceria alguma das duas barreiras.
 */
export default function DeleteSection({
  label,
  confirmToken,
  tokenHint = "o nome",
  buttonLabel,
  confirmTitle,
  confirmMessage,
  onDelete,
  children,
  className,
}: {
  /** Cabeçalho da seção, ex.: "Excluir setor". */
  label: string;
  /** Texto que precisa ser digitado — o nome do registro. */
  confirmToken: string;
  /** Como o campo se refere ao token. */
  tokenHint?: string;
  buttonLabel: string;
  confirmTitle: string;
  confirmMessage: string;
  onDelete: () => Promise<void>;
  /** O aviso: o que exatamente será apagado. */
  children: React.ReactNode;
  className?: string;
}) {
  const askConfirm = useConfirm();
  const { showToast } = useToast();
  const [digitado, setDigitado] = useState("");
  const [apagando, setApagando] = useState(false);

  const liberado = digitado.trim() === confirmToken.trim();

  const handleClick = async () => {
    const ok = await askConfirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmLabel: "Excluir",
    });
    if (!ok) {
      // Limpa o campo: cancelar não pode deixar o botão armado esperando um
      // clique distraído depois.
      setDigitado("");
      return;
    }

    setApagando(true);
    try {
      await onDelete();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao excluir.", "error");
      setApagando(false);
    }
    // Sem `finally`: no caminho de sucesso a tela navega para outro lugar, e
    // religar o botão só faria piscar antes de sumir.
  };

  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        <Trash2 size={16} className="text-destructive" />
        <SectionLabel as="span" className="text-destructive">{label}</SectionLabel>
      </div>
      <div className="card grid gap-3 border-destructive/30">
        <div className="text-sm text-muted-foreground">{children}</div>
        <Field
          label={<>Digite <code className="text-foreground">{confirmToken}</code> para liberar a exclusão</>}
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          placeholder={confirmToken}
          hint={`Confirmação por ${tokenHint}, para não apagar o registro errado.`}
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          variant="danger"
          onClick={handleClick}
          disabled={!liberado || apagando}
          className={cn("justify-self-start")}
        >
          <Trash2 size={18} />
          {apagando ? "Excluindo..." : buttonLabel}
        </Button>
      </div>
    </div>
  );
}
