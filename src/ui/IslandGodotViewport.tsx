import { useEffect, useRef, useState } from 'react';
import {
  envelope,
  godotShoreUrl,
  parseGodotMessage,
  postToGodot,
  saveSliceFrom,
  type GodotToShell,
} from '../bridge/godotBridge';
import type { SaveData } from '../core/schema';
import { webStorage } from '../platform/storage';

const GATE_TOAST = '营区未接';
const TOAST_MS = 2800;

export function IslandGodotViewport({
  save,
  paused,
  onInteract,
}: {
  save: SaveData;
  paused: boolean;
  onInteract: (id: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const enteredRef = useRef(false);
  const src = godotShoreUrl();

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = iframeRef.current;
      if (frame?.contentWindow && event.source !== frame.contentWindow) return;
      // Same-origin preferred; allow bypass host during local flag play.
      const allowed =
        event.origin === window.location.origin ||
        (src.startsWith('http') && (() => {
          try {
            return event.origin === new URL(src).origin;
          } catch {
            return false;
          }
        })());
      if (!allowed) return;

      const msg = parseGodotMessage(event.data);
      if (!msg) return;
      handleFromGodot(msg);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // handleFromGodot closes over latest callbacks via refs below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;
  const saveRef = useRef(save);
  saveRef.current = save;

  function handleFromGodot(msg: GodotToShell) {
    switch (msg.type) {
      case 'ready': {
        setReady(true);
        setLoadError(null);
        if (!enteredRef.current) {
          enteredRef.current = true;
          const s = saveRef.current;
          postToGodot(
            iframeRef.current,
            envelope('enterShore', {
              sceneId: 'dba.scene.shore',
              flags: s.flags,
              beats: s.beats,
              showGloss: s.settings.showGloss,
            }),
          );
        }
        break;
      }
      case 'spotAction':
        onInteractRef.current(msg.payload.id);
        break;
      case 'exitShore': {
        if (msg.payload.reason === 'gate') {
          setToast(GATE_TOAST);
          return;
        }
        if (msg.payload.reason === 'depart') {
          onInteractRef.current(msg.payload.spotId ?? 'shore-depart');
          return;
        }
        break;
      }
      case 'requestSave':
        webStorage().save(saveRef.current);
        break;
      case 'error':
        setLoadError(msg.payload.message || msg.payload.code);
        if (msg.payload.fatal) setReady(false);
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (paused) {
      postToGodot(iframeRef.current, envelope('pause', { reason: 'overlay' as const }));
    } else {
      postToGodot(iframeRef.current, envelope('resume', { reason: 'overlay-closed' as const }));
    }
  }, [paused, ready]);

  useEffect(() => {
    if (!ready || !enteredRef.current) return;
    postToGodot(iframeRef.current, envelope('setSaveSlice', saveSliceFrom(save)));
  }, [
    ready,
    save.currentScene,
    save.beats,
    save.flags,
    save.companion,
    save.settings.showGloss,
    save.feedback.seq,
    save.feedback.kind,
    save.feedback.spot,
    save.feedback.line,
  ]);

  useEffect(() => {
    if (!ready || paused) return;
    const focus = () => iframeRef.current?.contentWindow?.focus();
    focus();
    const id = window.setTimeout(focus, 50);
    return () => window.clearTimeout(id);
  }, [ready, paused]);

  return (
    <div
      className="godot-viewport"
      data-testid="godot-viewport"
      data-ready={ready ? 'yes' : 'no'}
      data-paused={paused ? 'yes' : 'no'}
    >
      {!ready ? (
        <div className="godot-loading" data-testid="godot-loading" role="status">
          <p className="eyebrow">雾岸</p>
          <p>{loadError ? loadError : '装载中…'}</p>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        className="godot-frame"
        data-testid="godot-iframe"
        title="雾岸 Godot"
        src={src}
        allow="autoplay; gamepad; fullscreen"
        style={{ pointerEvents: paused ? 'none' : 'auto' }}
      />
      {toast ? (
        <p className="godot-toast" data-testid="godot-toast" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
