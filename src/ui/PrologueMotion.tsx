import { useEffect, useRef, useState, type MutableRefObject } from 'react';

const fract = (n: number) => n - Math.floor(n);
const seed = (n: number) => fract(Math.sin(n * 127.1 + 31.7) * 43758.5453);
const MOODS = ['storm', 'rescue', 'memory', 'shore'];

/** Animate the painted water, weather and light in image coordinates. The full
 * composition stays inside its stage; controls and captions never shake. */
export function PrologueMotion({ src, step, portrait, active, reduced, time, alt, onError }: {
  src: string; step: number; portrait: boolean; active: boolean; reduced: boolean;
  time: MutableRefObject<number>; alt: string; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const aspect = portrait ? 2 / 3 : 1672 / 941;
      const width = Math.min(entry.contentRect.width, entry.contentRect.height * aspect);
      const height = width / aspect;
      setSize(old => Math.abs(old.width - width) < .1 && Math.abs(old.height - height) < .1 ? old : { width, height });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [portrait]);
  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !camera.current || !size.width) return;
    const ctx = surface.getContext('2d');
    if (!ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (surface.width !== Math.round(size.width * ratio) || surface.height !== Math.round(size.height * ratio)) {
      surface.width = Math.round(size.width * ratio); surface.height = Math.round(size.height * ratio);
    }
    if (reduced) { ctx.clearRect(0, 0, surface.width, surface.height); camera.current.style.transform = 'none'; return; }
    if (!active) return;
    const { width: w, height: h } = size;
    let frame = 0;
    let last = -Infinity;
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (now - last < 1000 / 30) return;
      last = now;
      const t = time.current;
      const scale = step < 2 ? .985 : .98 + .015 * (1 - Math.exp(-t / 5));
      const dx = step < 2 ? Math.sin(t * .55) * w * .0025 : 0;
      const dy = step < 2 ? Math.sin(t * 1.2) * h * (step === 0 ? .003 : .0015) : 0;
      camera.current!.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      const img = picture.current;
      if (img?.complete && img.naturalWidth > 0 && step !== 2) {
        // Only exposed water is displaced, never the traveler, cat, hand or shore.
        const top = step === 0 ? (portrait ? .85 : .82) : step === 1 ? .9 : (portrait ? .39 : .36);
        const bottom = step === 3 ? (portrait ? .46 : .44) : 1;
        const left = step === 3 ? .46 : 0;
        const right = step === 1 ? .63 : 1;
        const row = 3;
        for (let y = top*h; y < bottom*h; y += row) {
          const phase = (y/h - top) / (bottom - top);
          const drift = Math.sin(y*.055 - t*(step === 3 ? .8 : 1.6)) * w * (step === 3 ? .001 : .002);
          ctx!.globalAlpha = Math.sin(Math.PI*phase) * .55;
          const sh = Math.min(row, bottom*h-y);
          ctx!.drawImage(img, left*img.naturalWidth, y/h*img.naturalHeight,
            (right-left)*img.naturalWidth, sh/h*img.naturalHeight,
            left*w+drift, y, (right-left)*w, sh);
        }
        ctx!.globalAlpha = 1;
      }
      if (step < 2) {
        // Two depth/speed groups of rain, with a restrained amount on a phone.
        const count = step === 0 ? 100 : 38;
        ctx!.lineWidth = Math.max(.55, w / 1400);
        for (let i = 0; i < count; i++) {
          const depth = .45 + seed(i+3)*.55;
          const y = fract(seed(i+19) + t * (.32 + depth*.35)) * h;
          const x = fract(seed(i+83) - t * (.035 + depth*.025)) * w;
          const length = h * (.016 + depth*.025);
          ctx!.strokeStyle = `rgba(195,221,224,${(step === 0 ? .22 : .13)*depth})`;
          ctx!.beginPath(); ctx!.moveTo(x,y); ctx!.lineTo(x-length*.36,y+length); ctx!.stroke();
        }
        // Sea spray near the lens, not a full-screen white lightning flash.
        for (let i = 0; i < 16; i++) {
          const life = fract(t*.22 + seed(i+161));
          ctx!.fillStyle = `rgba(217,231,225,${Math.sin(life*Math.PI)*.13})`;
          ctx!.beginPath(); ctx!.arc(seed(i+199)*w, h*(1-life*.2), 1+seed(i+179)*1.8, 0, Math.PI*2); ctx!.fill();
        }
      } else if (step === 2) {
        const ox = .525*w, oy = (portrait ? .705 : .59)*h;
        const glow = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t-.8)/2.1))*Math.PI));
        const gradient = ctx!.createRadialGradient(ox,oy,0,ox,oy,w*.23);
        gradient.addColorStop(0, `rgba(255,201,100,${glow*.22})`); gradient.addColorStop(1,'rgba(255,201,100,0)');
        ctx!.fillStyle = gradient; ctx!.fillRect(0,0,w,h);
        const progress = Math.min(1, Math.max(0,(t-.8)/1.2));
        const points = portrait ? [[.51,.70],[.526,.735],[.55,.77],[.535,.8],[.57,.835]] : [[.515,.58],[.53,.64],[.55,.69],[.56,.74],[.595,.805]];
        ctx!.strokeStyle = `rgba(255,220,139,${.6*glow})`; ctx!.lineWidth = Math.max(1,w*.0014);
        ctx!.shadowColor = '#ffd17d'; ctx!.shadowBlur = 9;
        ctx!.beginPath(); ctx!.moveTo(points[0][0]*w,points[0][1]*h);
        for (let i=1;i<points.length;i++) {
          const part = Math.min(1, Math.max(0,progress*(points.length-1)-(i-1)));
          if (!part) break;
          ctx!.lineTo((points[i-1][0]+(points[i][0]-points[i-1][0])*part)*w,(points[i-1][1]+(points[i][1]-points[i-1][1])*part)*h);
        }
        ctx!.stroke(); ctx!.shadowBlur = 0;
        for (let i=0;i<32;i++) {
          const age = fract(t*.12+seed(i+281));
          const x = ox + (seed(i+293)-.5)*w*.3 + Math.sin(t+seed(i))*w*.006;
          const y = oy - age*h*.4;
          ctx!.fillStyle = `rgba(255,208,123,${Math.sin(age*Math.PI)*.55})`;
          ctx!.beginPath(); ctx!.arc(x,y,.5+seed(i+311)*1.3,0,Math.PI*2); ctx!.fill();
        }
      } else {
        for (let i=0;i<30;i++) {
          const x = w*(.47+seed(i+401)*.48);
          const y = h*((portrait ? .39 : .36)+seed(i+431)*.065);
          const light = Math.max(0, Math.sin(t*.8+seed(i+419)*Math.PI*2));
          ctx!.fillStyle = `rgba(255,228,174,${light*.28})`;
          ctx!.fillRect(x,y,1.5+seed(i+443)*4,.65);
        }
        // Quiet mist travels across the distant lake, below the mountain skyline.
        const fog = ctx!.createLinearGradient(0,h*.3,0,h*.54);
        fog.addColorStop(0,'rgba(207,222,219,0)'); fog.addColorStop(.5,`rgba(207,222,219,${.045+.02*Math.sin(t*.3)})`); fog.addColorStop(1,'rgba(207,222,219,0)');
        ctx!.fillStyle = fog; ctx!.fillRect(0,h*.3,w,h*.24);
      }
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, step, size, portrait, src, time]);

  return <div className="prologue-motion" ref={container} data-animation={MOODS[step]} data-motion={reduced ? 'reduced' : active ? 'playing' : 'paused'}>
    <div className="prologue-painting" style={size.width ? { width: size.width, height: size.height } : { width: '100%', height: '100%' }}>
      <div className="prologue-camera" ref={camera}>
        <img ref={picture} src={src} alt={alt} draggable={false} onError={onError} />
        <canvas ref={canvas} className="prologue-weather" aria-hidden="true" />
      </div>
    </div>
  </div>;
}
