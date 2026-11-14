/** Image-space joints; each edition has its own anatomical registration.
 * Small rotations with soft skin weights preserve the painted silhouettes. */
export type Joint = { name: string; mask: [number, number, number, number]; pivot: [number, number]; angle: number; shift: [number, number] };
export function prologueJoints(step: number, portrait: boolean, t: number): Joint[] {
  const wave = Math.sin(t * 1.3), breath = Math.sin(t * 1.7);
  const reach = Math.sin(Math.min(t / 4, 1) * Math.PI / 2);
  const joint = (name: string, wide: number[], tall: number[], angle: number, dx = 0, dy = 0): Joint => {
    const a = portrait ? tall : wide;
    return { name, mask: a.slice(0, 4) as Joint['mask'], pivot: [a[4], a[5]], angle, shift: [dx, dy] };
  };
  if (step === 0) return [
    joint('reaching-forearm', [.724,.64,.12,.12,.64,.60], [.724,.655,.14,.075,.61,.63], -.045*wave, .005*wave, -.003*wave),
    joint('wrist', [.759,.64,.065,.095,.704,.672], [.765,.655,.08,.065,.69,.68], .035*wave),
    joint('head', [.55,.453,.085,.14,.535,.55], [.495,.555,.11,.085,.48,.62], .022*breath),
  ];
  if (step === 1) return [
    joint('offering-wrist', [.664,.56,.125,.20,.75,.66], [.68,.611,.13,.10,.77,.67], -.06*reach, -.009*reach, -.003*reach),
    joint('cat-head', [.372,.38,.067,.125,.34,.465], [.416,.533,.09,.06,.38,.575], .045*Math.sin(t*.9)),
    joint('cat-paw', [.344,.55,.03,.058,.33,.50], [.39,.606,.035,.035,.375,.58], .09*Math.sin(t*1.4), 0, -.004*Math.max(0,wave)),
  ];
  if (step === 2) {
    // Wind-up, strike at the sound cue, then settle. Replay shares the same clock.
    const strike = t < .85 ? -Math.sin(t/.85*Math.PI/2) : -.12*Math.exp(-(t-.85)*2)*Math.cos((t-.85)*10);
    return [joint('striking-wrist', [.505,.30,.115,.25,.58,.22], [.505,.621,.12,.115,.59,.58], .025*strike, 0, .022*strike)];
  }
  return [
    joint('traveler-head', [.54,.40,.04,.07,.548,.443], [.55,.515,.052,.04,.55,.55], .035*Math.sin(t*.65)),
    joint('traveler-elbow', [.517,.578,.034,.10,.525,.50], [.516,.628,.035,.065,.532,.575], .035*breath),
    joint('cat-head', [.421,.709,.029,.045,.414,.744], [.414,.694,.04,.03,.402,.725], -.055*Math.sin(t*.9)),
    joint('cat-tail', [.373,.802,.035,.035,.393,.806], [.325,.76,.05,.035,.35,.764], .15*Math.sin(t*1.4)),
  ];
}
