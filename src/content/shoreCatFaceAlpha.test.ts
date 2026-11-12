import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('shore cat face interior alpha', () => {
  it('restores closed face holes from softfix-raw and leaves exterior/feet/opaque pixels untouched', () => {
    const out = execFileSync('python3', ['scripts/test_shore_cat_face_alpha.py'], {
      encoding: 'utf8',
    });
    expect(out).toContain('PASS');
  });
});
