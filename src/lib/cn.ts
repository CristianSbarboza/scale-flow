import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta classes condicionais e resolve conflitos entre utilitários do Tailwind.
 *
 * `twMerge` existe para que a prop `className` de um componente do kit vença
 * o padrão dele: `<Card className="p-2" />` fica com `p-2`, não com os dois
 * paddings brigando pela ordem em que caíram na folha de estilo.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
