import { useEffect, useRef, type MutableRefObject } from 'react';
import { prologueJoints } from './prologueRig';

const VERTEX = `attribute vec2 point; varying vec2 uv;
void main(){ uv=vec2(point.x*.5+.5,.5-point.y*.5); gl_Position=vec4(point,0.,1.); }`;
const FRAGMENT = `precision mediump float;
varying vec2 uv; uniform sampler2D painting; uniform vec4 masks[4];
uniform vec4 poses[4]; uniform vec2 shifts[4]; uniform float aspect;
void main(){ vec2 q=uv;
  for(int i=0;i<4;i++){
    float w=1.-smoothstep(.35,1.,length((uv-masks[i].xy)/max(masks[i].zw,vec2(.0001))));
    float a=poses[i].z*w; vec2 d=(uv-poses[i].xy)*vec2(aspect,1.);
    vec2 turn=vec2(cos(a)*d.x-sin(a)*d.y,sin(a)*d.x+cos(a)*d.y);
    q+=(turn-d)/vec2(aspect,1.)-shifts[i]*w;
  }
  gl_FragColor=texture2D(painting,clamp(q,0.,1.));
}`;

/** GPU skin deformation owns no story timers. Failed/lost WebGL leaves the
 * decoded <img> visible, so a low-end phone can still finish the prologue. */
export function PrologueLimbs({ src, step, portrait, reduced, time, width, height, onReady }: {
  src: string; step: number; portrait: boolean; reduced: boolean;
  time: MutableRefObject<number>; width: number; height: number; onReady: (ready: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    onReady(false);
    if (!width || reduced || import.meta.env.MODE === 'test') return;
    const surface = canvas.current!;
    const gl = surface.getContext('webgl', { alpha: false, antialias: false, depth: false });
    if (!gl) return;
    let live = true, raf = 0, lastTime = -1, lastDraw = -Infinity;
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const shaders: WebGLShader[] = [];
    const fail = () => { onReady(false); cancelAnimationFrame(raf); };
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    surface.addEventListener('webglcontextlost', lost);
    const img = new Image();
    try {
      if (!program || !buffer || !texture) throw new Error('GPU unavailable');
      for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Shader unavailable');
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader failed');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program failed');
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program, 'point');
      gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      gl.viewport(0,0,surface.width,surface.height);
      gl.uniform1f(gl.getUniformLocation(program, 'aspect'), width / height);
      const masks = gl.getUniformLocation(program, 'masks[0]');
      const poses = gl.getUniformLocation(program, 'poses[0]');
      const shifts = gl.getUniformLocation(program, 'shifts[0]');
      img.onload = () => {
        if (!live || gl.isContextLost()) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
          function draw(now: number) {
            if (!live || gl!.isContextLost()) return;
            raf = requestAnimationFrame(draw);
            if (time.current === lastTime || now - lastDraw < 1000/30) return;
            lastTime = time.current; lastDraw = now;
            const joints = prologueJoints(step, portrait, time.current);
            const m = new Float32Array(16), p = new Float32Array(16), s = new Float32Array(8);
            joints.forEach((joint,i) => { m.set(joint.mask,i*4); p.set([...joint.pivot,joint.angle,0],i*4); s.set(joint.shift,i*2); });
            gl!.uniform4fv(masks,m); gl!.uniform4fv(poses,p); gl!.uniform2fv(shifts,s);
            gl!.drawArrays(gl!.TRIANGLES,0,6);
            onReady(true);
          }
          raf = requestAnimationFrame(draw);
        } catch { fail(); }
      };
      img.onerror = fail;
      img.src = src;
    } catch { fail(); }
    return () => {
      live=false; cancelAnimationFrame(raf); img.onload=null; img.onerror=null;
      surface.removeEventListener('webglcontextlost',lost);
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
  }, [src, step, portrait, reduced, time, width, height, onReady]);
  return <canvas ref={canvas} className="prologue-limbs" data-testid="prologue-limbs" aria-hidden="true" />;
}
