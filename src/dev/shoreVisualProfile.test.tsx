import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';

// An assertion (not an unresolved-import error) identifies the missing opt-in feature.
let api: any;
beforeAll(async () => {
  const modules = import.meta.glob('./shoreVisualProfile.ts');
  expect(modules['./shoreVisualProfile.ts'], 'explicit local sample profile is missing').toBeTypeOf('function');
  api = await modules['./shoreVisualProfile.ts']();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('local opt-in sample boundary', () => {
  it('keeps ordinary builds, remote hosts, absent/unknown variants baseline', () => {
    for (const [enabled, hostname, search] of [
      [false, 'localhost', '?shoreVisual=candidate&fixture=shore-spawn&freeze=1'],
      [true, 'example.com', '?shoreVisual=candidate&fixture=shore-spawn&freeze=1'],
      [true, 'localhost', ''], [true, 'localhost', '?shoreVisual=invalid&fixture=shore-spawn&freeze=1'],
    ] as const) {
      expect(api.readShoreVisualProfile({ enabled, hostname, search })).toEqual({ variant: 'baseline', fixture: null, cat: 'S0' });
    }
  });
  it('enables only explicit localhost profiles and allowlisted frozen fixtures', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
      expect(api.readShoreVisualProfile({ enabled: true, hostname, search: '?shoreVisual=candidate&fixture=shore-spawn&freeze=1&cat=S1' }))
        .toEqual({ variant: 'candidate', fixture: 'shore-spawn', cat: 'S1' });
    }
    expect(api.readShoreVisualProfile({ enabled: true, hostname: 'localhost', search: '?shoreVisual=baseline&fixture=south&freeze=1' }).fixture).toBe('south');
    expect(api.readShoreVisualProfile({ enabled: true, hostname: 'localhost', search: '?shoreVisual=candidate&fixture=unknown&freeze=1' }).fixture).toBeNull();
    expect(api.readShoreVisualProfile({ enabled: true, hostname: 'localhost', search: '?shoreVisual=candidate&fixture=shore-spawn' }).fixture).toBeNull();
  });
  it('makes repeatable shore state without reading or writing storage', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const first = api.makeShoreFixture('shore-spawn', 'S0');
    expect(first).toEqual(api.makeShoreFixture('shore-spawn', 'S0'));
    expect(first.traveler).toEqual({ x: .42, y: .62 });
    expect(first.save.currentScene).toBe('dba.scene.shore');
    expect(first.catPost.beat).toBe('S0');
    expect(api.makeShoreFixture('shore-spawn', 'S1').catPost.beat).toBe('S1');
    expect(api.makeShoreFixture('shore-spawn', 'S2').catPost.beat).toBe('S2');
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it('renders the real WalkLayer in a frozen, storage-free fixture', async () => {
    const load = import.meta.glob('./ShoreVisualSample.tsx')['./ShoreVisualSample.tsx'];
    expect(load, 'real-renderer fixture is missing').toBeTypeOf('function');
    const read = vi.spyOn(Storage.prototype, 'getItem'); const write = vi.spyOn(Storage.prototype, 'setItem');
    const { ShoreVisualSample } = await load() as any;
    render(<ShoreVisualSample profile={{ variant: 'baseline', fixture: 'shore-spawn', cat: 'S0' }} />);
    expect(screen.getByTestId('walk-stage').getAttribute('data-scene')).toBe('dba.scene.shore');
    expect(screen.getByTestId('traveler').style.left).toBe('42%');
    expect(screen.getByTestId('companion-anchor').getAttribute('data-beat')).toBe('S0');
    expect(screen.getByTestId('shore-visual-sample').getAttribute('data-frozen')).toBe('yes');
    expect(JSON.parse(screen.getByTestId('shore-fixture-metadata').textContent!)).toMatchObject({ fixture: 'shore-spawn', traveler: { x: .42, y: .62 } });
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it('does not eagerly import App (and its persistent store) before choosing fixture', () => {
    const entry = readFileSync('src/main.tsx', 'utf8');
    expect(entry).not.toMatch(/import\s+\{\s*App\s*\}\s+from/);
    expect(entry).toContain("import('./App')");
  });
});
