import { describe, expect, it } from 'vitest';
import { checkContent } from './content-check';

describe('content check', () => {
  it('accepts the island 1 draft pack', () => {
    expect(checkContent()).toEqual([]);
  });
});
