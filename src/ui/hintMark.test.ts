import { describe, expect, it } from 'vitest';
import { hintMark } from './hintMark';

const base = { level: 0, anchor: 'driftwood', wordId: null };

describe('hintMark', () => {
  it('keeps a quiet dot at the first hint and names the spot only later', () => {
    expect(hintMark({ ...base, level: 0 }, 'driftwood')).toBe('');
    expect(hintMark({ ...base, level: 1 }, 'driftwood')).toBe('hint-glance');
    expect(hintMark({ ...base, level: 1 }, 'gourd')).toBe('');
    expect(hintMark({ ...base, level: 2 }, 'driftwood')).toBe('hint-near');
    expect(hintMark({ level: 3, anchor: 'mural-object', wordId: 'dba.word.water' }, 'mural-object', 'dba.word.water')).toBe('hint-near hint-paw');
    expect(hintMark({ level: 3, anchor: 'mural-object', wordId: 'dba.word.water' }, 'mural-object', 'dba.word.fire')).toBe('');
  });
});
