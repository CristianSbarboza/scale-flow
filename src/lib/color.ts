/** Conversões entre hex e HSV, usadas pelo seletor de cor. */

export interface Hsv {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255);
  };
  return "#" + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function hexToHsv(hex: string): Hsv | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;

  let corpo = m[1];
  if (corpo.length === 3) corpo = corpo.split("").map((c) => c + c).join("");

  const r = parseInt(corpo.slice(0, 2), 16) / 255;
  const g = parseInt(corpo.slice(2, 4), 16) / 255;
  const b = parseInt(corpo.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/** Normaliza o que a pessoa digitou: aceita `f80`, `#F80`, `ff8800`. */
export function normalizeHex(input: string): string | null {
  const hsv = hexToHsv(input);
  return hsv ? hsvToHex(hsv) : null;
}

export { clamp };
