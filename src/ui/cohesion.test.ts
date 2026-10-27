import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ellipseSizeFor, ellipseWidthPct, hasPngContact, sceneGrade } from './cohesion';

describe('cohesion shadows and grades', () => {
  it('records contract 1.3 and does not stack an ellipse on baked contact', () => {
    const contract = JSON.parse(readFileSync('docs/art-scale-contract.json', 'utf8')) as {
      version: string;
      cohesion: { baked_contact_shadow_props: string[] };
    };
    expect(contract.version).toBe('1.3-failfix');
    expect(contract.cohesion.baked_contact_shadow_props).toContain('shore/art.shore.prop.driftwood.png');
    expect(contract.cohesion.baked_contact_shadow_props).toContain('night/art.night.prop.old-layer.png');
    expect(hasPngContact('art.shore.prop.driftwood')).toBe(true);
    expect(hasPngContact('art.camp.prop.fire')).toBe(true);
    expect(hasPngContact('art.night.prop.old-layer')).toBe(true);
    expect(hasPngContact('art.camp.prop.act-home')).toBe(true);
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.shore.prop.driftwood', asset: 'art.shore.prop.driftwood', kind: 'driftwood', w: 0.24 }),
    ).toBeNull();
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.night.prop.old-layer', asset: 'art.night.prop.old-layer', kind: 'old-layer', w: 0.42 }),
    ).toBeNull();
    expect(
      ellipseSizeFor({ slot: 'building', id: 'art.camp.building', asset: 'art.camp.building', kind: 'shed', w: undefined }),
    ).toBeNull();
  });

  it('gives unbaked footed props a shared ellipse that widens with depth', () => {
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.shore.prop.break-shard', asset: 'art.shore.prop.break-shard', kind: 'break-shard', w: 0.1 }),
    ).toBe('s');
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.path.prop.step-stones', asset: 'art.path.prop.step-stones', kind: 'step-stones', w: 0.32 }),
    ).toBe('l');
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.shore.prop.east-gap', asset: 'art.shore.prop.east-gap', kind: 'light-slit', w: 0.34 }),
    ).toBeNull();
    expect(ellipseWidthPct(0.9)).toBeGreaterThan(ellipseWidthPct(0.3));
    expect(sceneGrade('dba.scene.shore')).toMatch(/grade\.shore/);
    expect(sceneGrade('dba.scene.camp')).toMatch(/grade\.camp/);
    expect(sceneGrade('dba.scene.night')).toMatch(/grade\.night/);
  });
});
