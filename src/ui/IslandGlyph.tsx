import { SCRIPT_WORDS, type ScriptWord } from '../content/islandScript';

// A small, consistent carved alphabet: shared stems, different turns and ticks.
// No pictograms or authentic-script claims; its meaning comes from usage.
const paths = [
  'M18 12v36l24-12V18M18 28l12-8', 'M18 12v36l24-12V18M30 36v16', 'M18 12v36l24-12V18M10 38l8-4',
  'M14 14h32L22 46V24M34 34l12 10', 'M14 14h32L22 46V24M12 36h10', 'M14 14h32L22 46V24M38 8v12',
  'M14 12v30h32V12M14 26l16 8 16-8', 'M14 12v30h32V12M30 34v18', 'M14 12v30h32V12M8 20h12',
  'M30 10 12 30l18 20 18-20ZM30 10v20', 'M30 10 12 30l18 20 18-20ZM30 30v20', 'M30 10 12 30l18 20 18-20ZM12 30h18',
  'M12 16h32L20 32h24L20 48M36 10v12', 'M12 16h32L20 32h24L20 48M36 26v12', 'M12 16h32L20 32h24L20 48M12 42h14',
  'M14 12v36h30V12M14 22l30 16', 'M14 12v36h30V12M14 38l30-16', 'M14 12v36h30V12M30 22v30',
];
export function IslandGlyph({word}:{word:ScriptWord}) {
  const n=SCRIPT_WORDS.findIndex(w=>w[0]===word);
  return <svg className="island-glyph" viewBox="0 0 60 60" role="img" aria-label={`刻符 ${String(n+1).padStart(2,'0')}`}><path d={paths[n]} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square" strokeLinejoin="miter"/></svg>;
}
