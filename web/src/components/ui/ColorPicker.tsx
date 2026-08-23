"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { clamp, hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@/lib/color";

/**
 * Seletor de cor: área de saturação e brilho, barra de matiz e campo de hex.
 *
 * Vive num portal porque abre por cima do modal de configurações — dentro dele
 * o `overflow` do corpo rolável cortaria a área de seleção.
 */
export default function ColorPicker({
  value,
  onConfirm,
  onClose,
}: {
  value: string;
  onConfirm: (hex: string) => void;
  onClose: () => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 24, s: 0.94, v: 0.98 });
  const [texto, setTexto] = useState(value);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hex = hsvToHex(hsv);

  const atualizar = (novo: Hsv) => {
    setHsv(novo);
    setTexto(hsvToHex(novo));
  };

  // Arrastar na área 2D: x vira saturação, y vira brilho.
  const apontar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caixa = areaRef.current?.getBoundingClientRect();
    if (!caixa) return;
    atualizar({
      ...hsv,
      s: clamp((e.clientX - caixa.left) / caixa.width),
      v: clamp(1 - (e.clientY - caixa.top) / caixa.height),
    });
  };

  const conteudo = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher cor"
        onClick={(e) => e.stopPropagation()}
        className="card glass w-full max-w-[320px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base">Escolher cor</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn btn-ghost rounded-full p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Saturação (eixo x) e brilho (eixo y) */}
        <div
          ref={areaRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            apontar(e);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && apontar(e)}
          className="relative h-40 w-full cursor-crosshair touch-none rounded-lg"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
          }}
        >
          <span
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
          />
        </div>

        {/* Matiz */}
        <label className="sr-only" htmlFor="matiz">Matiz</label>
        <input
          id="matiz"
          type="range"
          min={0}
          max={360}
          value={Math.round(hsv.h)}
          onChange={(e) => atualizar({ ...hsv, h: Number(e.target.value) })}
          className="color-slider mt-4 h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        />

        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden
            className="size-9 shrink-0 rounded-full border border-card-border"
            style={{ background: hex }}
          />
          <div className="grid flex-1 gap-1">
            <label htmlFor="hex" className="text-xs text-muted-foreground">Código</label>
            <input
              id="hex"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                const limpo = hexToHsv(e.target.value);
                if (limpo) setHsv(limpo);
              }}
              placeholder="#f97316"
              spellCheck={false}
              className="input py-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm(normalizeHex(texto) ?? hex)}
          >
            Usar cor
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(conteudo, document.body);
}
