import type { EndingContent, SaveData } from './schema';

export type EndingId = EndingContent['id'];
export type EndingChoice = 'deny' | 'stay' | 'restart';

const MAIN_EVIDENCE = ['myp.ev.main', 'nmn.ev.main', 'amh.ev.main', 'iku.ev.main', 'eus.ev.main'];

export function caseIsFull(state: SaveData): boolean {
  return MAIN_EVIDENCE.every((id) => state.evidence.includes(id)) && state.evidence.length >= 12;
}

export function resolveEnding(state: SaveData): EndingId | null {
  if (state.flags['fin.flag.confronted'] !== true) return null;
  const admitted = state.flags['fin.flag.admit'] === true;
  if (!caseIsFull(state) || !admitted) return 'false-home';
  if (state.flags['fin.flag.choice'] === 'restart') return 'restart-echo';
  if (state.flags['fin.flag.choice'] === 'stay') return 'new-interpreter';
  return null;
}

export function chooseEnding(state: SaveData, choice: EndingChoice): SaveData {
  const flags: SaveData['flags'] = {
    ...state.flags,
    'fin.flag.confronted': true,
  };
  if (!caseIsFull(state) || choice === 'deny') {
    flags['fin.flag.admit'] = false;
    delete flags['fin.flag.choice'];
    delete flags['fin.flag.name-recalled'];
    delete flags['fin.flag.recognition-lost'];
    return { ...state, flags };
  }
  flags['fin.flag.admit'] = true;
  flags['fin.flag.name-recalled'] = true;
  flags['fin.flag.choice'] = choice;
  if (choice === 'restart') flags['fin.flag.recognition-lost'] = true;
  else delete flags['fin.flag.recognition-lost'];
  return { ...state, flags };
}
