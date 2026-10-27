import { describe, expect, it } from 'vitest';
import { nanaichaState } from './CatMark';

describe('nanaichaState', () => {
  it('maps hint levels onto look, walk, and tap', () => {
    expect(nanaichaState(1, 'lead')).toBe('look');
    expect(nanaichaState(2, 'wait')).toBe('walk');
    expect(nanaichaState(2, 'tail-point')).toBe('walk');
    expect(nanaichaState(3, 'paw')).toBe('tap');
    expect(nanaichaState(0, 'paw')).toBe('tap');
  });

  it('uses tilt for a wrong look, and carry or guard on those beats', () => {
    expect(nanaichaState(1, 'look-at')).toBe('tilt');
    expect(nanaichaState(0, 'fetch')).toBe('carry');
    expect(nanaichaState(0, 'curl')).toBe('guard');
    expect(nanaichaState(0, 'look-back')).toBe('look');
    expect(nanaichaState(0, 'lead')).toBe('walk');
    expect(nanaichaState(0, 'wait')).toBe('idle');
    expect(nanaichaState(0, 'idle')).toBe('idle');
  });
});
