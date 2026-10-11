/**
 * Presentation-only helpers. They never change stored values: inputs are
 * exact decimal strings from the server/form and are only trimmed for display.
 */
const DEC = /^-?\d+(\.\d+)?$/;

/** Trims insignificant trailing zeros from an exact decimal string ("12.500" -> "12.5", "40.000" -> "40"). */
export function trimDecimal(value: string): string {
  const s = value.trim();
  if (!DEC.test(s) || !s.includes('.')) return s;
  const out = s.replace(/0+$/, '').replace(/\.$/, '');
  return out === '-0' ? '0' : out;
}

/** Groups the integer part with thin separators for readability without rounding. */
export function readableDecimal(value: string): string {
  const s = trimDecimal(value);
  if (!DEC.test(s)) return s;
  const neg = s.startsWith('-');
  const [int, frac] = (neg ? s.slice(1) : s).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

const POS = /^(0|[1-9]\d{0,5})(\.\d{1,3})?$/;
export interface BoardPreview {
  width: number; height: number;
  /** True only when every margin is an explicit valid value (explicit 0 allowed). */
  marginsValid: boolean;
  left: number; right: number; top: number; bottom: number;
  /** Null unless marginsValid and the usable area is positive. */
  usableW: string | null; usableH: string | null;
}

/**
 * Board geometry for an early preview. Returns null unless width and height are
 * valid positive values the user actually entered. Margins are never assumed:
 * if any margin is empty or invalid, only the board outline is described.
 */
export function boardPreview(f: { width: string; height: string; left: string; right: string; top: string; bottom: string }): BoardPreview | null {
  const g = (v: string) => Math.round(Number(v) * 1000);
  const w = f.width.trim(), h = f.height.trim();
  if (!POS.test(w) || !POS.test(h) || g(w) <= 0 || g(h) <= 0) return null;
  const ms = [f.left, f.right, f.top, f.bottom].map((v) => v.trim());
  const marginsValid = ms.every((v) => POS.test(v));
  const [l, r, t, b] = marginsValid ? ms.map(g) : [0, 0, 0, 0];
  const uw = g(w) - l - r, uh = g(h) - t - b;
  const fmt = (n: number) => trimDecimal((n / 1000).toFixed(3));
  const usable = marginsValid && uw > 0 && uh > 0;
  return {
    width: g(w) / 1000, height: g(h) / 1000, marginsValid,
    left: l / 1000, right: r / 1000, top: t / 1000, bottom: b / 1000,
    usableW: usable ? fmt(uw) : null, usableH: usable ? fmt(uh) : null,
  };
}

/** Pure square-lock transition: returns the next locked set and an optional height patch. */
export function toggleSquareLock(locked: ReadonlySet<string>, key: string, width: string, height: string): { next: Set<string>; patch: { height: string } | null } {
  const next = new Set(locked);
  if (next.has(key)) { next.delete(key); return { next, patch: null }; }
  next.add(key);
  return { next, patch: width !== height ? { height: width } : null };
}

/** Width edit under a square lock mirrors into height. */
export function squareWidthPatch(locked: ReadonlySet<string>, key: string, value: string): { width: string; height?: string } {
  return locked.has(key) ? { width: value, height: value } : { width: value };
}
