import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function mediaBlock(source: string, header: string) {
  const start = source.indexOf(header);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

describe('phone layout', () => {
  const css = readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');

  it('keeps both orientations playable and gives phone controls a 44px target', () => {
    expect(css).not.toMatch(/\.rotate-hint\s*\{[^}]*display:\s*grid/);
    expect(css).not.toContain('orientation: portrait');
    expect(css).toContain('safe-area-inset-top');
    expect(css).toContain('safe-area-inset-bottom');
    const phone = mediaBlock(css, '@media (max-width: 960px), (max-height: 540px)');
    expect(phone).toContain('min-height: 44px');
    expect(phone).toContain('.hud-actions');
    expect(phone).toContain('flex-direction: row');
    expect(phone).toContain('.companion-anchor');
    expect(phone).not.toContain('translate(-72%');
    expect(phone).not.toContain('-108%');
    expect(phone).toContain('pointer-events: none');
    expect(css).not.toMatch(/body\s*\{[^}]*touch-action:\s*none/);
  });

  it('does not scroll hard vertical stripes across the shore', () => {
    expect(css).not.toContain('water-shift');
    expect(css).not.toContain('@keyframes water-shift');
    expect(css).not.toContain('repeating-linear-gradient(90deg, transparent 0 28px');
    expect(css).not.toContain('repeating-linear-gradient(90deg, transparent 0 22px');
    expect(css).toContain('display: none');
    expect(css).toContain('object-position: center bottom');
    expect(css).toContain('.prop-contact');
    expect(css).toContain('.world-post');
  });

  it('does not pin the traveler to fixed pixels on a phone', () => {
    const phone = mediaBlock(css, '@media (max-width: 960px), (max-height: 540px)');
    expect(phone).not.toMatch(/\.traveler\s*\{[^}]*46px/);
    expect(phone).not.toMatch(/\.traveler\s*\{[^}]*112px/);
    expect(css).not.toMatch(/\.traveler\s*\{[^}]*width:\s*117px/);
    expect(css).not.toMatch(/\.traveler\s*\{[^}]*height:\s*156px/);
  });
});
