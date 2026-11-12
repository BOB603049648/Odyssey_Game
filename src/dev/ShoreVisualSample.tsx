import { useEffect, useRef, useState } from 'react';
import { WalkLayer } from '../ui/WalkLayer';
import { visibleSpots } from '../ui/spotViews';
import { sceneLook } from '../ui/cohesion';
import { makeShoreFixture, type ShoreVisualProfile } from './shoreVisualProfile';
import './shoreVisualSample.css';

const noop = () => {};
const hint = { level: 0 as const, anchor: 'driftwood' as const, wordId: null, pose: 'idle' as const };

/** Frozen diagnostic view, not a replacement game. Live play uses App without fixture=. */
export function ShoreVisualSample({ profile }: { profile: ShoreVisualProfile }) {
  const name = profile.fixture ?? 'shore-spawn';
  const fixture = makeShoreFixture(name, profile.cat);
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => `${window.innerWidth}x${window.innerHeight}`);
  const [measurement, setMeasurement] = useState<object>({});
  useEffect(() => {
    const resize = () => setSize(`${window.innerWidth}x${window.innerHeight}`);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const stage = host.current?.querySelector<HTMLElement>('[data-testid="walk-stage"]');
    if (!stage) return;
    const read = () => {
      const rect = stage.getBoundingClientRect();
      const world = stage.querySelector<HTMLElement>('.world-layer');
      setMeasurement({ viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio }, gameRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, camera: { x: Number(stage.dataset.camX), y: Number(stage.dataset.camY) }, world: { width: world?.style.width, height: world?.style.height } });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(stage, { attributes: true });
    return () => observer.disconnect();
  }, [size]);
  const look = sceneLook('dba.scene.shore');
  return (
    <main className="stage">
      <section className="island">
        <div ref={host} className="shore-wrap shore-visual-fixture" data-testid="shore-visual-sample" data-frozen="yes" data-scene="dba.scene.shore" data-hotspots="off" style={{ ['--ambient' as string]: look.ambient }}>
          <WalkLayer key={`${name}-${profile.cat}-${size}`} scene="dba.scene.shore" drank={false}
            spots={visibleSpots('dba.scene.shore', fixture.save, hint)} hint={hint} paused={true}
            purr={false} knot="rest" presentationFrozen remembered={fixture.traveler} catPost={fixture.catPost} taught={true}
            onRemember={noop} onExit={noop} onInteract={noop} onAsk={noop} onEscape={noop} />
          <output hidden data-testid="shore-fixture-metadata">{JSON.stringify({ variant: profile.variant, fixture: name, frozen: true, traveler: fixture.traveler, catPost: fixture.catPost, ...measurement })}</output>
        </div>
      </section>
    </main>
  );
}
