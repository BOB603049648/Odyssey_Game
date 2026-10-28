import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ellipseSizeFor, ellipseWidthPct, hasPngContact, sceneGrade } from './cohesion';

describe('cohesion shadows and grades', () => {
  it('records contract 1.3 and does not stack an ellipse on baked contact', () => {
    const contract = JSON.parse(readFileSync('docs/art-scale-contract.json', 'utf8')) as {
      version: string;
      cohesion: { baked_contact_shadow_props: string[] };
      pr11_ground: { do_not_stack_hard_shadow_on_baked_props: boolean; fog_rule: string };
      pr12_sticker: { eng_must_not: string; fog_match_baked: boolean };
    };
    expect(contract.version).toBe('1.3-pr22-step-r');
    expect(contract.pr12_sticker.fog_match_baked).toBe(true);
    expect(contract.pr12_sticker.eng_must_not).toMatch(/uniform fog alpha/);
    expect(contract.pr11_ground.do_not_stack_hard_shadow_on_baked_props).toBe(true);
    expect(contract.pr11_ground.fog_rule).toMatch(/AFTER composite/);
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

  it('keeps the shared ellipse off props; depth still widens the traveler mark', () => {
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.shore.prop.break-shard', asset: 'art.shore.prop.break-shard', kind: 'break-shard', w: 0.1 }),
    ).toBeNull();
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.path.prop.step-stones', asset: 'art.path.prop.step-stones', kind: 'step-stones', w: 0.32 }),
    ).toBeNull();
    expect(
      ellipseSizeFor({ slot: 'props', id: 'art.shore.prop.east-gap', asset: 'art.shore.prop.east-gap', kind: 'light-slit', w: 0.34 }),
    ).toBeNull();
    expect(ellipseWidthPct(0.9)).toBeGreaterThan(ellipseWidthPct(0.3));
    expect(sceneGrade('dba.scene.shore')).toMatch(/grade\.shore/);
    expect(sceneGrade('dba.scene.camp')).toMatch(/grade\.camp/);
    expect(sceneGrade('dba.scene.night')).toMatch(/grade\.night/);
  });

  it('grades sprites by their own alpha and keeps the foot ellipse off the rectangular mask', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('.figure-grade');
    expect(css).toMatch(/\.figure-grade\.grade-color\s*\{[^}]*mix-blend-mode:\s*color/);
    expect(css).not.toMatch(/\.figure-grade\s*\{[^}]*mix-blend-mode:\s*multiply/);
    expect(css).not.toContain('mask-image: var(--ellipse)');
    expect(css).not.toContain('translate(-50%, 46%)');
    expect(css).not.toContain('translate(-50%, 42%)');
    expect(css).toMatch(/\.traveler \.foot-ellipse[\s\S]*?background:\s*none/);
    expect(css).toMatch(/\.companion-anchor \.foot-ellipse[\s\S]*?background:\s*none/);
    expect(css).toMatch(/\.traveler \.figure-grade\s*\{[^}]*#000 80%[^}]*mask-composite:\s*intersect/);
    expect(css).not.toContain('.sole-stamp');
    expect(css).not.toContain('transparent 91%');
    expect(css).toMatch(/\.sole-soft\s*\{[^}]*transparent 94\.6%[^}]*#000 96\.2%/);
    expect(css).not.toContain('shadow-tint');
    expect(css).toMatch(/dba\.scene\.shore"\] \.companion-anchor \.figure-grade\.grade-color\s*\{[^}]*opacity:\s*0/);
    expect(css).not.toContain('.sole-ao');
    expect(css).not.toContain('.fog-fringe');
    const companion = readFileSync('src/ui/Companion.tsx', 'utf8');
    const walk = readFileSync('src/ui/WalkLayer.tsx', 'utf8');
    expect(companion).not.toContain('foot-ellipse');
    expect(companion).not.toContain('companion-contact');
    expect(walk).not.toContain('sole-stamp');
    expect(walk).not.toContain('foot-ellipse');
  });
});
