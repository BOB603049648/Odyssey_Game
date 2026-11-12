import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('shore cat interior alpha', () => {
  it('has no closed body holes and leaves the delivered opaque pixels untouched', () => {
    const out = execFileSync('python3', ['scripts/test_cat_interior_alpha.py'], {
      encoding: 'utf8',
    });
    expect(out).toContain('PASS');
  });
});
