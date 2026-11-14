import { parseSave } from '../core/migrate';
import { isIslandScene } from '../core/island';
import { initialWords } from '../core/save';
import type { SaveData } from '../core/schema';
import { RELEASE_VERSION } from '../release';

export const MAX_BACKUP_BYTES = 1024 * 1024;
export function encodeBackup(save: SaveData): string {
  return JSON.stringify({ format: 'odyssey-save', release: RELEASE_VERSION, exportedAt: new Date().toISOString(), save }, null, 2);
}
export function decodeBackup(text: string): SaveData | null {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) return null;
  try {
    const raw = JSON.parse(text);
    const save = parseSave(raw?.format === 'odyssey-save' ? raw.save : raw);
    if (!save) return null;
    const prologue = ['pro.scene.title', 'pro.scene.storm', 'pro.scene.dark', 'pro.scene.break', 'pro.scene.tide'];
    if (!isIslandScene(save.currentScene) && !prologue.includes(save.currentScene)) return null;
    if (save.screen === 'prologue' && !prologue.includes(save.currentScene)) return null;
    if (save.screen === 'title' && save.currentScene !== 'pro.scene.title') return null;
    if (save.prologueStep > 3 || save.cutsceneStep > 2) return null;
    if ((save.screen === 'island' || save.screen === 'mural') && !isIslandScene(save.currentScene)) return null;
    const words = initialWords();
    for (const [id, word] of Object.entries(save.words)) {
      if (!(id in words) || word.id !== id) return null;
      words[id] = word;
    }
    return { ...save, words, overlay: save.overlay === 'depart' || save.overlay === 'memory' ? save.overlay : 'none',
      companion: { level: 0, targetId: null, pawUsed: false }, feedback: { seq: save.feedback.seq, kind: 'none' } };
  } catch { return null; }
}
