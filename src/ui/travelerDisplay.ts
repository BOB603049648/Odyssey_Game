export function heldFrameIndex(requested: number, firstFrameReady: boolean): number {
  return firstFrameReady ? requested : 0;
}

export function idleFilesToRequest(
  files: readonly string[],
  requestedIndex: number,
  firstFrameReady: boolean,
): string[] {
  if (files.length === 0) return [];
  if (!firstFrameReady) return [files[0]];
  const index = Math.min(files.length - 1, Math.max(0, requestedIndex));
  return [files[index]];
}

export function displaySrc(
  _file: string,
  readyUrl: string | null | undefined,
  lastReadyUrl?: string | null,
): string {
  return readyUrl ?? lastReadyUrl ?? '';
}

export function shouldKeepOutgoingFrame(input: { outgoingLoading: boolean; blendElapsedMs: number }): boolean {
  return input.outgoingLoading;
}

export function firstScreenTravelerFile(): string {
  return 'idle-front-01.png';
}
