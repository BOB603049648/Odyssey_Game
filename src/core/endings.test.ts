import { describe, expect, it } from 'vitest';
import zh from '../../content/locales/zh-CN.json';
import { ENDINGS } from '../content/catalog';
import { newGameState } from './save';
import { resolveEnding } from './endings';

describe('ending stubs', () => {
  it('keeps the three documented endings and does not add a restart ending', () => {
    expect(ENDINGS.map((ending) => ending.id)).toEqual([
      'false-home',
      'new-interpreter',
      'forget-again',
    ]);
    expect(zh['ending.false-home']).toBe('假归乡');
    expect(zh['ending.new-interpreter']).toBe('新渡语人');
    expect(zh['ending.forget-again']).toBe('再忘');
    expect(Object.values(zh).join('\n')).not.toContain('重启回声');
    expect(resolveEnding(newGameState())).toBeNull();
  });
});
