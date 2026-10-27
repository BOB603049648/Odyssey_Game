import { describe, expect, it } from 'vitest';
import zh from '../../content/locales/zh-CN.json';
import { COMPANION, ENDINGS, EVIDENCE, LEXEMES } from './catalog';

const GLOSSES = [
  '太阳',
  '月亮',
  '水',
  '火',
  '鱼',
  '人',
  '吃',
  '喝',
  '睡',
  '走',
  '给',
  '拿',
  '我',
  '你',
  '大与小',
  '多与少',
  '危险',
  '饥饿',
  '分享',
  '等待',
  '承诺',
  '信任',
  '保护',
  '背叛',
  '谎言',
  '想念',
  '原谅',
  '归处',
];

describe('island 1 catalog', () => {
  it('ships the 28 dongba teaching glosses with empty unverified forms', () => {
    expect(LEXEMES.map((item) => item.gloss)).toEqual(GLOSSES);
    expect(new Set(LEXEMES.map((item) => item.id)).size).toBe(28);
    for (const lexeme of LEXEMES) {
      expect(lexeme.island).toBe('dba');
      expect(lexeme.inLexicon).toBe(true);
      expect(lexeme.verification.status).toBe('draft');
      expect(lexeme.forms.native ?? '').toBe('');
      expect(lexeme.forms.translit ?? '').toBe('');
      expect(lexeme.audio).toEqual([]);
    }
    expect(LEXEMES.filter((item) => item.layer === 'concrete')).toHaveLength(6);
    expect(LEXEMES.filter((item) => item.layer === 'action')).toHaveLength(6);
    expect(LEXEMES.filter((item) => item.layer === 'relation')).toHaveLength(5);
    expect(LEXEMES.filter((item) => item.layer === 'abstract')).toHaveLength(11);
  });

  it('resolves every dependency and keeps the guide from teaching words', () => {
    const ids = new Set(LEXEMES.map((item) => item.id));
    for (const lexeme of LEXEMES) {
      for (const requirement of lexeme.requires) expect(ids.has(requirement)).toBe(true);
    }
    expect(COMPANION.name).toBe('奈奈茶');
    expect(COMPANION.speaks).toBe(false);
    expect(COMPANION.teachesLanguage).toBe(false);
    expect(EVIDENCE.map((item) => item.id)).toEqual(['dba.ev.a', 'dba.ev.b', 'dba.ev.main']);
    expect(ENDINGS.map((item) => item.id)).toEqual(['false-home', 'new-interpreter', 'restart-echo']);
    expect(zh['evidence.dba.ev.a']).toBe('签署手势');
    expect(zh['evidence.dba.ev.main']).toBe('抹画的长卷');
    expect(zh['prologue.2']).toContain('长卷');
    expect(zh['prologue.2']).not.toContain('石头');
    expect(COMPANION.form.markings).not.toContain('雨林');
    expect(COMPANION.form.markings).toContain('帽兜');
    const prologue = Object.entries(zh)
      .filter(([key]) => key.startsWith('prologue.'))
      .map(([, value]) => value)
      .join('\n');
    expect(prologue).not.toContain('奈奈茶');
  });
});
