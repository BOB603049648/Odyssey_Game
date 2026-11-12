import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('mid-air guide frames', () => {
  it('carry no baked ground shadow and stay out of black-silhouette range', () => {
    const out = execFileSync('python3', ['scripts/test_leap_frames.py'], { encoding: 'utf8' });
    expect(out).toContain('PASS');
  });
});
