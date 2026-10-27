export function hintMark(
  hint: { level: number; anchor: string; wordId: string | null },
  anchor: string,
  wordId?: string,
): string {
  if (hint.level < 1 || hint.anchor !== anchor) return '';
  if (wordId && hint.wordId !== wordId) return '';
  if (hint.level === 1) return 'hint-glance';
  return hint.level >= 3 ? 'hint-near hint-paw' : 'hint-near';
}
