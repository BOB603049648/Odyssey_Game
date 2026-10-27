import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('walk touch', () => {
  it('keeps pan and pinch off the walk stage and its hit targets', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const block = css.match(/\.walk-viewport,\s*\.world-cam,[\s\S]*?\{[^}]*\}/);
    expect(block).toBeTruthy();
    const rule = block?.[0] ?? '';
    for (const selector of ['.world-layer', '.walk-ground', '.world-layer .hotspot', '.path-exit', '.shore-wrap .companion']) {
      expect(rule).toContain(selector);
    }
    expect(rule).toContain('touch-action: none');
    expect(rule).toContain('overscroll-behavior: none');
    expect(rule).toContain('-webkit-touch-callout: none');
    expect(css).not.toMatch(/body\s*\{[^}]*touch-action:\s*none/);
  });
});
