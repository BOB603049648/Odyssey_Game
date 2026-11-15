import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BANDS } from '../core/stage';
import { WORLD_SCALE } from '../core/walk';
import { PlateStack } from './Plate';

afterEach(cleanup);
const css = readFileSync('src/styles.css', 'utf8');
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rule(selector: string): string {
  const match = css.match(new RegExp(`${escape(selector)}\\s*\\{([^}]+)\\}`));
  return match?.[1] ?? '';
}
function property(text: string, name: string): string {
  return text.match(new RegExp(`(?:^|;)\\s*${escape(name)}\\s*:\\s*([^;]+)`))?.[1].trim() ?? '';
}
function style(node: HTMLElement, name: string): string {
  return node.style.getPropertyValue(name) || [...node.classList]
    .map((c) => property(rule(`.${c}`), name)).find(Boolean) || '';
}
function length(value: string, parentHeight: number): number {
  if (!value || value === 'auto') return 0;
  if (value.endsWith('%')) return Number.parseFloat(value) * parentHeight / 100;
  if (value.endsWith('px') || value === '0') return Number.parseFloat(value);
  throw new Error(`Geometry test must explicitly support CSS length ${value}`);
}
function geometry(viewportHeight: number) {
  const worldHeight = viewportHeight * WORLD_SCALE;
  const view = render(<PlateStack plate="dba.scene.shore" previous={null} pass="back" />);
  const tread = view.getByTestId('shore-tread') as HTMLElement;
  const lip = view.getByTestId('shore-stone-lip') as HTMLElement;
  const fog = view.getByTestId('shore-fog-line') as HTMLElement;
  const root = { top: length(tread.style.top, worldHeight), height: length(tread.style.height, worldHeight) };
  type Box = { top: number; height: number; bottom: number };
  function box(node: HTMLElement): Box {
    if (node === tread) return { ...root, bottom: root.top + root.height };
    if (!tread.contains(node)) throw new Error('Node is not in the real tread subtree');
    const parent = box(node.parentElement!);
    const height = style(node, 'height');
    const h = height ? length(height, parent.height)
      : parent.height - length(style(node, 'top'), parent.height) - length(style(node, 'bottom'), parent.height);
    const top = style(node, 'top');
    const offset = top ? length(top, parent.height) : parent.height - length(style(node, 'bottom'), parent.height) - h;
    return { top: parent.top + offset, height: h, bottom: parent.top + offset + h };
  }
  function clip(node: HTMLElement) {
    // Real .plate-fade clips the world at [0, worldHeight]. Masking ancestors
    // default to border-box; derive their boxes from actual rendered DOM/CSS.
    const result = { top: 0, bottom: worldHeight };
    let parent = node.parentElement!;
    while (tread.contains(parent) || parent === tread) {
      const mask = style(parent, 'mask-image') || style(parent, '-webkit-mask-image');
      const clipped = Boolean(mask && mask !== 'none') || style(parent, 'overflow') === 'hidden';
      if (clipped) {
        const bounds = box(parent);
        result.top = Math.max(result.top, bounds.top);
        result.bottom = Math.min(result.bottom, bounds.bottom);
      }
      if (parent === tread) break;
      parent = parent.parentElement!;
    }
    return result;
  }
  return { view, tread, lip, fog, root, worldHeight, box, clip };
}
function gradientAlpha(t: number): number {
  if (t < 0 || t > 1) return 0;
  const stops = [...property(rule('.shore-stone-lip'), 'background')
    .matchAll(/(transparent|rgba\([^)]*\))\s+([\d.]+)%/g)]
    .map((m) => ({ at: Number(m[2]) / 100, alpha: m[1] === 'transparent' ? 0 : Number(m[1].slice(5, -1).split(',').pop()) }));
  if (stops.length !== 4) throw new Error('Expected the real four-stop lip gradient');
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (t <= b.at) return a.alpha + (b.alpha - a.alpha) * (t - a.at) / (b.at - a.at);
  }
  return stops[stops.length - 1].alpha;
}
function blurRadius(node: HTMLElement) {
  const radius = style(node, 'filter').match(/blur\(([\d.]+)px\)/);
  if (!radius) throw new Error('Missing the real CSS blur');
  return Number(radius[1]);
}
function blurredLipAlpha(g: ReturnType<typeof geometry>, y: number) {
  const clip = g.clip(g.lip);
  if (y < clip.top || y >= clip.bottom) return 0;
  const box = g.box(g.lip), sigma = blurRadius(g.lip);
  // Gaussian blur first, ancestor mask second: this is why a child blur
  // cannot soften a hard mask cut. Integrate +/-6 sigma at sigma/32 steps.
  let alpha = 0, weight = 0;
  for (let i = -192; i <= 192; i++) {
    const offset = i * sigma / 32;
    const w = Math.exp(-0.5 * (offset / sigma) ** 2);
    alpha += gradientAlpha((y + offset - box.top) / box.height) * w;
    weight += w;
  }
  return alpha / weight;
}

describe('shore lip clipping regression: actual CSS and rendered hierarchy', () => {
  it('preserves real band, band-relative fog/lip anchor geometry, gradient alphas and blur rather than hiding shade', () => {
    const g = geometry(1072);
    expect(BANDS['dba.scene.shore']).toMatchObject({ minY: 0.62, maxY: 0.88 });
    expect(g.box(g.lip).top / g.worldHeight).toBeCloseTo(0.8436, 10);
    expect(g.box(g.lip).bottom / g.worldHeight).toBeCloseTo(0.9008, 10);
    expect(g.box(g.fog).top / g.worldHeight).toBeCloseTo(0.594, 10);
    expect(g.box(g.fog).height / g.root.height).toBeCloseTo(0.24, 10);
    expect(gradientAlpha(0.62)).toBeCloseTo(0.2, 10);
    expect(gradientAlpha(1)).toBeCloseTo(0.28, 10);
    expect(blurRadius(g.lip)).toBe(4);
    expect(blurRadius(g.fog)).toBe(8);
    expect(style(g.lip, 'display')).not.toBe('none');
    expect(style(g.lip, 'opacity')).toBe('');
  });

  it('the walk band south edge lies 63.636% through nonzero dark gradient, but must no longer hard-cut that blurred paint', () => {
    const g = geometry(1072);
    const edge = g.root.top + g.root.height, lip = g.box(g.lip);
    const fraction = (edge - lip.top) / lip.height;
    expect(fraction).toBeCloseTo(7 / 11, 10);
    expect(gradientAlpha(fraction)).toBeGreaterThan(0.2);
    expect(Math.abs(blurredLipAlpha(g, edge + 0.25) - blurredLipAlpha(g, edge - 0.25))).toBeLessThan(0.002);
  });

  it.each([320, 540, 720, 1072, 1440, 2160])('contains fog and lip 4-sigma tails before ANY mask/world clip at viewport height %i', (height) => {
    const g = geometry(height);
    for (const node of [g.fog, g.lip]) {
      const paint = g.box(node), clip = g.clip(node), tail = 4 * blurRadius(node);
      expect(paint.top - tail).toBeGreaterThan(clip.top);
      expect(paint.bottom + tail).toBeLessThan(clip.bottom);
    }
    // On the south endpoint, four-sigma alpha is already < half an 8-bit LSB.
    expect(blurredLipAlpha(g, g.box(g.lip).bottom + 4 * blurRadius(g.lip))).toBeLessThan(0.5 / 255);
  });

  it('keeps one masked compositing group and the exact original horizontal fade for all three layers', () => {
    const g = geometry(1072);
    const envelope = g.view.getByTestId('shore-tread-envelope') as HTMLElement;
    const content = g.view.getByTestId('shore-tread-content') as HTMLElement;
    expect(style(g.tread, 'mask-image')).toBe('');
    expect(style(g.tread, '-webkit-mask-image')).toBe('');
    expect(content.parentElement).toBe(envelope);
    expect(content.children).toHaveLength(3);
    expect(g.lip.parentElement).toBe(content);
    expect(g.fog.parentElement).toBe(content);
    expect(g.box(content).top).toBeCloseTo(g.root.top, 8);
    expect(g.box(content).height).toBeCloseTo(g.root.height, 8);
    for (const node of [envelope, content]) {
      expect(style(node, 'left')).toBe('0');
      expect(style(node, 'right')).toBe('0');
    }
    const fade = 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)';
    expect(style(envelope, 'mask-image')).toBe(fade);
    expect(style(envelope, '-webkit-mask-image')).toBe(fade);
    expect(rule('.shore-tread-envelope')).not.toContain('no-clip');
    expect(rule('.shore-tread-content')).not.toMatch(/mask-|opacity:|isolation:|filter:|transform:/);
    // Keeping sand inside the same mask group preserves its screen blending
    // with fog; splitting each painter into separate masked groups would not.
    expect(style(g.view.getByTestId('shore-sand-trace') as HTMLElement, 'mix-blend-mode')).toBe('screen');
  });
});
