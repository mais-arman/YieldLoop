/** Pure panel geometry in millimetres. X = length, Y = height (up), Z = width. Each panel is a box with real thickness. */
import type { Dims } from './packaging-validation';
import type { TemplateId, ViewState } from './packaging-templates';

export type Vec3 = [number, number, number];
export interface Panel { id: string; group: 'base' | 'wall' | 'top' | 'lid'; size: Vec3; center: Vec3 }

const box = (id: string, group: Panel['group'], size: Vec3, bottomY: number, x = 0, z = 0): Panel =>
  ({ id, group, size, center: [x, bottomY + size[1] / 2, z] });

export function trayPanels({ L, W, H, t }: Dims): Panel[] {
  return [
    box('base', 'base', [L + 2 * t, t, W + 2 * t], 0),
    box('side_xneg', 'wall', [t, H, W], t, -(L + t) / 2),
    box('side_xpos', 'wall', [t, H, W], t, (L + t) / 2),
    box('end_zneg', 'wall', [L + 2 * t, H, t], t, 0, -(W + t) / 2),
    box('end_zpos', 'wall', [L + 2 * t, H, t], t, 0, (W + t) / 2),
  ];
}

/** Separated panels: translate outward, sizes untouched. Not an unfolded dieline. */
export function explodeTray(panels: Panel[], d: Dims): Panel[] {
  const gap = Math.max(d.L, d.W, d.H) * 0.35;
  return panels.map((p) => {
    const [x, y, z] = p.center;
    const dx = Math.sign(x) * (Math.abs(x) > 0 ? gap : 0);
    const dz = Math.sign(z) * (Math.abs(z) > 0 ? gap : 0);
    const dy = p.group === 'base' ? -gap * 0.6 : 0;
    return { ...p, center: [x + dx, y + dy, z + dz] };
  });
}

export function sleevePanels({ L, W, H, t }: Dims): Panel[] {
  return [
    box('base', 'base', [L, t, W + 2 * t], 0),
    box('top', 'top', [L, t, W + 2 * t], H + t),
    box('side_zneg', 'wall', [L, H, t], t, 0, -(W + t) / 2),
    box('side_zpos', 'wall', [L, H, t], t, 0, (W + t) / 2),
  ];
}

export function lidPanels(d: Dims): Panel[] {
  const { L, W, H, t } = d;
  const c = d.c ?? 0; const lh = d.lid ?? 0;
  const Li = L + 2 * t + 2 * c; const Wi = W + 2 * t + 2 * c;
  const topBottom = H + t + c;
  const wallBottom = topBottom - lh;
  return [
    box('lid_top', 'lid', [Li + 2 * t, t, Wi + 2 * t], topBottom),
    box('lid_xneg', 'lid', [t, lh, Wi], wallBottom, -(Li + t) / 2),
    box('lid_xpos', 'lid', [t, lh, Wi], wallBottom, (Li + t) / 2),
    box('lid_zneg', 'lid', [Li + 2 * t, lh, t], wallBottom, 0, -(Wi + t) / 2),
    box('lid_zpos', 'lid', [Li + 2 * t, lh, t], wallBottom, 0, (Wi + t) / 2),
  ];
}

/** Open lid: straight lift along +Y. No hinge is modelled or implied. */
export function liftLid(panels: Panel[], d: Dims): Panel[] {
  const lift = (d.lid ?? 0) + d.H * 0.6;
  return panels.map((p) => p.group === 'lid' ? { ...p, center: [p.center[0], p.center[1] + lift, p.center[2]] } : p);
}

export function buildPanels(template: TemplateId, d: Dims, state: ViewState): Panel[] {
  if (template === 'tray') {
    const p = trayPanels(d);
    return state === 'open' ? explodeTray(p, d) : p;
  }
  if (template === 'sleeve') {
    if (state !== 'assembled') throw new Error('sleeve_open_unsupported');
    return sleevePanels(d);
  }
  const all = [...trayPanels(d), ...lidPanels(d)];
  return state === 'open' ? liftLid(all, d) : all;
}

export function bounds(panels: Panel[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity]; const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of panels) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], p.center[i] - p.size[i] / 2);
    max[i] = Math.max(max[i], p.center[i] + p.size[i] / 2);
  }
  return { min, max };
}

/** Overall external envelope in assembled state (mm). */
export function externalSize(template: TemplateId, d: Dims): Vec3 {
  const b = bounds(buildPanels(template, d, 'assembled'));
  return [0, 1, 2].map((i) => Math.round((b.max[i] - b.min[i]) * 1000) / 1000) as Vec3;
}
