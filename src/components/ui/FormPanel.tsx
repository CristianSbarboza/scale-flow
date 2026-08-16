import Panel from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

/**
 * Painel do formulário de criação, à esquerda das telas de lista do admin.
 *
 * É um Panel com a classe `admin-form-panel`, que o esconde no celular — lá o
 * mesmo formulário aparece no AdminCreateModal, aberto pelo botão da topbar.
 * O componente existe para essa regra ficar num lugar só: antes cada tela
 * repetia a classe solta, e esquecer dela deixava o formulário duplicado no
 * celular, uma vez na página e outra no modal.
 */
export default function FormPanel({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel title={title} className={cn("admin-form-panel", className)}>
      {children}
    </Panel>
  );
}
