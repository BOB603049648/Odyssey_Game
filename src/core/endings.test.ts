import { describe, expect, it } from 'vitest';
import zh from '../../content/locales/zh-CN.json';
import { ENDINGS } from '../content/catalog';
import { chooseEnding, resolveEnding } from './endings';
import { newGameState } from './save';
import { wordStateSchema } from './schema';

function confronted(choice: 'deny' | 'stay' | 'restart', evidence: string[]) {
  const base = {
    ...newGameState(),
    evidence,
  };
  return chooseEnding(base, choice);
}

const fullCase = [
  'myp.ev.a',
  'myp.ev.b',
  'myp.ev.main',
  'nmn.ev.a',
  'nmn.ev.b',
  'nmn.ev.main',
  'amh.ev.a',
  'amh.ev.b',
  'amh.ev.main',
  'iku.ev.a',
  'iku.ev.main',
  'eus.ev.main',
];

describe('ending stubs', () => {
  it('locks the three endings as false home, new interpreter, and restart echo', () => {
    expect(ENDINGS.map((ending) => ending.id)).toEqual([
      'false-home',
      'new-interpreter',
      'restart-echo',
    ]);
    expect(zh['ending.false-home']).toBe('假归乡');
    expect(zh['ending.new-interpreter']).toBe('新渡语人');
    expect(zh['ending.restart-echo']).toBe('重启回声');
    expect(JSON.stringify(zh)).not.toContain('再忘');
    expect(JSON.stringify(ENDINGS)).not.toContain('forget-again');
    expect(wordStateSchema.options).not.toContain('ghost');
    expect('ngCount' in newGameState()).toBe(false);
    expect(resolveEnding(newGameState())).toBeNull();
  });

  it('resolves A, B, and C without a replay path', () => {
    expect(resolveEnding(confronted('deny', fullCase))).toBe('false-home');
    expect(resolveEnding(confronted('stay', ['myp.ev.a']))).toBe('false-home');
    const stay = confronted('stay', fullCase);
    const restart = confronted('restart', fullCase);
    expect(resolveEnding(stay)).toBe('new-interpreter');
    expect(stay.flags['fin.flag.recognition-lost']).toBeUndefined();
    expect(resolveEnding(restart)).toBe('restart-echo');
    expect(restart.flags['fin.flag.recognition-lost']).toBe(true);
    expect(restart.flags['fin.flag.name-recalled']).toBe(true);
  });
});
