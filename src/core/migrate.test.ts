import { describe, expect, it } from 'vitest';
import { parseSave } from './migrate';
import { newGameState } from './save';

describe('legacy save remap', () => {
  it('turns a piraha yard save into the dongba yard', () => {
    const fresh = newGameState('2020-01-01T00:00:00.000Z');
    const raw = JSON.parse(JSON.stringify(fresh)) as {
      currentScene: string;
      chart: string[];
      evidence: string[];
      words: Record<string, { id: string }>;
    };
    const water = raw.words['dba.word.water'];
    delete raw.words['dba.word.water'];
    raw.words['myp.word.water'] = { ...water, id: 'myp.word.water' };
    raw.currentScene = 'myp.scene.fishery';
    raw.chart = ['chart.nmn'];
    raw.evidence = ['myp.ev.main'];

    const parsed = parseSave(raw);
    expect(parsed?.currentScene).toBe('dba.scene.yard');
    expect(parsed?.chart).toEqual(['chart.jgw']);
    expect(parsed?.evidence).toContain('dba.ev.main');
    expect(parsed?.words['dba.word.water']?.id).toBe('dba.word.water');
    expect(parsed?.words['myp.word.water']).toBeUndefined();
  });
});
