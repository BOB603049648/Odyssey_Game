/**
 * Web shell ↔ Godot HTML5 iframe bridge (B vertical slice).
 * Contract: odyssey-docs/godot-b-bridge-draft-2026-10-30.md §3 / §6.
 * Godot never writes localStorage; SaveData + reduce stay authoritative in TS.
 */

export const BRIDGE_CHANNEL = 'odyssey-godot-bridge' as const;
export const BRIDGE_V = 1 as const;

export type BridgeEnvelope<T extends string, P> = {
  channel: typeof BRIDGE_CHANNEL;
  v: typeof BRIDGE_V;
  type: T;
  reqId?: string;
  payload: P;
};

/** Shell → Godot */
export type EnterShorePayload = {
  sceneId: 'dba.scene.shore';
  spawn?: { x: number; y: number };
  flags?: Record<string, boolean | number | string>;
  beats?: Record<string, boolean>;
  showGloss?: boolean;
};

export type PausePayload = { reason: 'overlay' | 'mural' | 'blur' };
export type ResumePayload = { reason?: string };

export type SaveSlicePayload = {
  currentScene?: string;
  beats?: Record<string, boolean>;
  flags?: Record<string, boolean | number | string>;
  wordsLearned?: string[];
  companion?: { level: number; targetId: string | null; pawUsed: boolean };
  settings?: { showGloss: boolean };
  feedback?: { kind: string; spot?: string; line?: string };
};

export type ShellToGodot =
  | BridgeEnvelope<'enterShore', EnterShorePayload>
  | BridgeEnvelope<'pause', PausePayload>
  | BridgeEnvelope<'resume', ResumePayload>
  | BridgeEnvelope<'setSaveSlice', SaveSlicePayload>;

/** Godot → Shell */
export type ReadyPayload = { sceneId: string; buildId?: string; contractId?: string };
export type ExitShorePayload = {
  reason: 'gate' | 'depart' | 'ui';
  to?: string;
  spotId?: string;
};
export type SpotActionPayload = { id: string; hint?: string };
export type RequestSavePayload = { reason: 'checkpoint' | 'exit' | 'idle' };
export type ErrorPayload = { code: string; message: string; fatal?: boolean };

export type GodotToShell =
  | BridgeEnvelope<'ready', ReadyPayload>
  | BridgeEnvelope<'exitShore', ExitShorePayload>
  | BridgeEnvelope<'spotAction', SpotActionPayload>
  | BridgeEnvelope<'requestSave', RequestSavePayload>
  | BridgeEnvelope<'error', ErrorPayload>;

export type GodotToShellType = GodotToShell['type'];

/** Truthy env values that turn on the Godot shore iframe. Default off = zero Godot refs. */
export function parseGodotShoreFlag(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function isGodotShoreEnabled(): boolean {
  return parseGodotShoreFlag(import.meta.env.VITE_GODOT_SHORE);
}

/** iframe src; production same-origin `/godot/`; local may point at the A bypass host. */
export function godotShoreUrl(): string {
  const raw = import.meta.env.VITE_GODOT_URL;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return '/godot/';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const FROM_GODOT_TYPES = new Set<string>(['ready', 'exitShore', 'spotAction', 'requestSave', 'error']);

/**
 * Parse a postMessage data payload. Ignores wrong channel / version / unknown types.
 * Returns null when the message is not for this bridge.
 */
export function parseGodotMessage(data: unknown): GodotToShell | null {
  if (!isRecord(data)) return null;
  if (data.channel !== BRIDGE_CHANNEL) return null;
  if (data.v !== BRIDGE_V) return null;
  if (typeof data.type !== 'string' || !FROM_GODOT_TYPES.has(data.type)) return null;
  if (!isRecord(data.payload)) return null;

  const base = {
    channel: BRIDGE_CHANNEL,
    v: BRIDGE_V,
    ...(typeof data.reqId === 'string' ? { reqId: data.reqId } : {}),
  } as const;

  switch (data.type) {
    case 'ready': {
      if (typeof data.payload.sceneId !== 'string') return null;
      return {
        ...base,
        type: 'ready',
        payload: {
          sceneId: data.payload.sceneId,
          ...(typeof data.payload.buildId === 'string' ? { buildId: data.payload.buildId } : {}),
          ...(typeof data.payload.contractId === 'string' ? { contractId: data.payload.contractId } : {}),
        },
      };
    }
    case 'exitShore': {
      const reason = data.payload.reason;
      if (reason !== 'gate' && reason !== 'depart' && reason !== 'ui') return null;
      return {
        ...base,
        type: 'exitShore',
        payload: {
          reason,
          ...(typeof data.payload.to === 'string' ? { to: data.payload.to } : {}),
          ...(typeof data.payload.spotId === 'string' ? { spotId: data.payload.spotId } : {}),
        },
      };
    }
    case 'spotAction': {
      if (typeof data.payload.id !== 'string' || !data.payload.id) return null;
      return {
        ...base,
        type: 'spotAction',
        payload: {
          id: data.payload.id,
          ...(typeof data.payload.hint === 'string' ? { hint: data.payload.hint } : {}),
        },
      };
    }
    case 'requestSave': {
      const reason = data.payload.reason;
      if (reason !== 'checkpoint' && reason !== 'exit' && reason !== 'idle') return null;
      return { ...base, type: 'requestSave', payload: { reason } };
    }
    case 'error': {
      if (typeof data.payload.code !== 'string' || typeof data.payload.message !== 'string') return null;
      return {
        ...base,
        type: 'error',
        payload: {
          code: data.payload.code,
          message: data.payload.message,
          ...(typeof data.payload.fatal === 'boolean' ? { fatal: data.payload.fatal } : {}),
        },
      };
    }
    default:
      return null;
  }
}

export function envelope<T extends string, P>(type: T, payload: P, reqId?: string): BridgeEnvelope<T, P> {
  return {
    channel: BRIDGE_CHANNEL,
    v: BRIDGE_V,
    type,
    payload,
    ...(reqId ? { reqId } : {}),
  };
}

/** postMessage into the Godot iframe. Uses explicit targetOrigin when URL is absolute. */
export function postToGodot(
  iframe: HTMLIFrameElement | null,
  message: ShellToGodot,
  targetOrigin?: string,
): boolean {
  const win = iframe?.contentWindow;
  if (!win) return false;
  let origin = targetOrigin;
  if (!origin) {
    try {
      const src = iframe?.src || '';
      origin = src.startsWith('http') ? new URL(src).origin : window.location.origin;
    } catch {
      origin = window.location.origin;
    }
  }
  win.postMessage(message, origin);
  return true;
}

/** Build the enterShore / setSaveSlice world slice from SaveData (subset only). */
export function saveSliceFrom(save: {
  currentScene: string;
  beats: Record<string, boolean>;
  flags: Record<string, boolean | number | string>;
  companion: { level: number; targetId: string | null; pawUsed: boolean };
  settings: { showGloss: boolean };
  feedback: { kind: string; spot?: string; line?: string };
}): SaveSlicePayload {
  return {
    currentScene: save.currentScene,
    beats: save.beats,
    flags: save.flags,
    companion: save.companion,
    settings: { showGloss: save.settings.showGloss },
    feedback: {
      kind: save.feedback.kind,
      ...(save.feedback.spot ? { spot: save.feedback.spot } : {}),
      ...(save.feedback.line ? { line: save.feedback.line } : {}),
    },
  };
}
