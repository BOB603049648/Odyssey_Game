import { describe, expect, it } from 'vitest';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';
import { decodeBackup, encodeBackup, MAX_BACKUP_BYTES } from './saveBackup';

describe('portable save backups', () => {
  const played = () => reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'skip-prologue' });
  it('round-trips progression and clears transient panels', () => {
    const save = played(); save.overlay='settings'; save.beats['dba.beat.water']=true;
    const restored = decodeBackup(encodeBackup(save))!;
    expect(restored.beats).toEqual(save.beats); expect(restored.evidence).toEqual(save.evidence);
    expect(restored.currentScene).toBe(save.currentScene); expect(restored.overlay).toBe('none');
  });
  it('accepts a raw historical save and keeps an unfinished story scene', () => {
    const save=played(); save.overlay='memory'; save.cutsceneStep=2;
    expect(decodeBackup(JSON.stringify(save))?.cutsceneStep).toBe(2);
    expect(decodeBackup(JSON.stringify(save))?.overlay).toBe('memory');
  });
  it('rejects malformed, oversized and unplayable data', () => {
    expect(decodeBackup('{')).toBeNull(); expect(decodeBackup(' '.repeat(MAX_BACKUP_BYTES+1))).toBeNull();
    expect(decodeBackup(JSON.stringify({...played(), currentScene:'future.scene.missing'}))).toBeNull();
    expect(decodeBackup(JSON.stringify({...played(), cutsceneStep:99}))).toBeNull();
    expect(decodeBackup(JSON.stringify({...played(), words:{unknown:{id:'unknown',state:'learned',box:1,correct:0,wrong:0}}}))).toBeNull();
  });
});
