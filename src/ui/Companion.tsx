import { useCallback, useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react';
import { writeCatDisplayAttributes } from './catDisplay';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { HintLevel } from '../core/schema';
import { loadCatSrc } from './catImage';
import { CatMark, nanaichaState, type KnotMark } from './companion/CatMark';
import { t } from './i18n';
import { companionAtlasSource, COMPANION_ATLAS } from '../content/characterPerformanceAtlas';

export type CompanionProps = {
  level: HintLevel;
  anchor: HintAnchor;
  pose: CompanionPose;
  purr: boolean;
  knot?: KnotMark;
  onAsk: () => void;
  /** Grounded scene plate or a trajectory frame. The anchor still moves. */
  figure?: string;
  onFigureError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  frame?: string;
  /** Only the WalkLayer record opts into source-keyed native error isolation. */
  imageKey?: string;
  imageRevision?: number;
  imageScope?: string;
  figureRef?: (node: HTMLImageElement | null) => void;
  /** Only explicit approved fixture diagnostic; no bearing certification. */
  diagnostic?: boolean;
};

/** Source/loading lifetime follows WalkLayer, never the legacy/depth view parent. */
export function useCompanionPresentation(figure:string|undefined, revision=0) {
  const [ready,setReady]=useState({src:figure,originalUrl:figure,revision});
  useEffect(() => {
    if (!figure) {
      setReady({src:undefined,originalUrl:undefined,revision});
      return undefined;
    }
    let live = true;
    setReady({src:figure,originalUrl:figure,revision});
    // The complete sheet was decoded atomically by trajArt. One native URL
    // serves all cells; fetching a blob per frame wastes memory and breaks it.
    if (companionAtlasSource(figure)) return undefined;
    loadCatSrc(figure).then((next) => {
      if (live) setReady({src:next,originalUrl:figure,revision});
    }, () => { /* Keep the ready raw/current bitmap if an unexpected loader rejection occurs. */ });
    return () => { live=false; };
  },[figure,revision]);
  // Effects run after commit. Never paint the previous blob under new raw metadata
  // during that intervening render; figure is already decoded by useAssetSrc.
  return ready.originalUrl === figure && ready.revision === revision
    ? {src:ready.src,originalUrl:ready.originalUrl} : {src:figure,originalUrl:figure};
}
export type CompanionPresentation=ReturnType<typeof useCompanionPresentation>;

export function CompanionView({
  level,
  anchor,
  pose,
  purr,
  knot = 'rest',
  onAsk,
  figure,
  frame,
  imageKey,
  imageRevision = 0,
  imageScope = '',
  figureRef,
  onFigureError,
  diagnostic = false,
  presentation,
}: CompanionProps & {presentation:CompanionPresentation}) {
  const {src}=presentation;
  const cell = companionAtlasSource(presentation.originalUrl);
  const bitmap = cell && src?.includes('#') ? src.slice(0, src.indexOf('#')) : src;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const bindImage = useCallback((node: HTMLImageElement | null) => { imageRef.current = node; figureRef?.(node); }, [figureRef]);
  useLayoutEffect(() => { if (imageRef.current) writeCatDisplayAttributes(imageRef.current, diagnostic); }, [src, figure, diagnostic]);
  return (
    <button
      type="button"
      className={purr ? 'companion purr' : 'companion'}
      data-testid="companion"
      data-companion="nanaicha"
      data-level={level}
      data-look={anchor}
      data-pose={pose}
      data-state={nanaichaState(level, pose)}
      data-knot={knot}
      data-frame={frame}
      onClick={onAsk}
      aria-label={t('companion.ask')}
    >
      <span className="companion-mirror">
        <span className="companion-sway">
          {figure ? (
            <span className="nanaicha-figure" style={{ ['--figure' as string]: `url("${bitmap ?? figure}")`, ...(cell ? { overflow: 'hidden' } : {}) }}>
              <img key={cell ? `atlas:${imageScope}:${COMPANION_ATLAS.url}:${imageRevision}` : imageKey} ref={bindImage} onLoad={() => { if (imageRef.current) writeCatDisplayAttributes(imageRef.current, diagnostic); }} className="nanaicha-ground" data-look={anchor} data-frame={frame} data-performance={cell?.file}
                style={cell ? { position: 'absolute', width: `${COMPANION_ATLAS.width / cell.width * 100}%`, height: `${COMPANION_ATLAS.height / cell.height * 100}%`, left: `${-cell.x / cell.width * 100}%`, top: `${-cell.y / cell.height * 100}%`, maxWidth: 'none', objectFit: 'fill' } : undefined}
                src={bitmap ?? figure} alt="" draggable={false} onError={onFigureError} />
              <span className="figure-grade grade-color" />
              <span className="figure-grade grade-soft" />
            </span>
          ) : (
            <CatMark look={anchor} state={nanaichaState(level, pose)} knot={knot} />
          )}
        </span>
      </span>
    </button>
  );
}

export function Companion(props:CompanionProps) {
  const presentation=useCompanionPresentation(props.figure);
  return <CompanionView {...props} presentation={presentation}/>;
}
