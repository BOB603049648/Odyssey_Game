import bounds from '../content/sceneArtBounds.json';

/** Display the authored subject, not the transparent padding around it.
 * SVG's viewBox keeps aspect ratio and bottom registration independent of the
 * device and the source canvas. Source pixels are never recolored or keyed. */
export function SceneArt({ asset, src, onError }: { asset: string; src: string; onError: () => void }) {
  const box = (bounds as Record<string, { width: number; height: number; box: number[] }>)[asset];
  if (!box) return <img className="slot-asset" src={src} alt="" draggable={false} onError={onError} />;
  return <svg className="slot-asset subject-art" viewBox={box.box.join(' ')} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <foreignObject width={box.width} height={box.height}>
      <img className="slot-asset" src={src} alt="" draggable={false} onError={onError} style={{ width: box.width, height: box.height, maxWidth: 'none' }} />
    </foreignObject>
  </svg>;
}
