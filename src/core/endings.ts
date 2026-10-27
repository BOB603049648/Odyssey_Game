import type { EndingContent, SaveData } from './schema';

// docs/05 locks ending C as 再忘 (forget-again). The task brief also wrote
// 「重启回声」, which contradicts that bible and docs/03, so this stub does
// not add a restart-the-hub ending.
export function resolveEnding(_state: SaveData): EndingContent['id'] | null {
  return null;
}
