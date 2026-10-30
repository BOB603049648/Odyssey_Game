import { describe, expect, it } from 'vitest';
import {
  BRIDGE_CHANNEL,
  BRIDGE_V,
  envelope,
  parseGodotMessage,
  parseGodotShoreFlag,
  saveSliceFrom,
} from './godotBridge';

describe('parseGodotShoreFlag', () => {
  it('is off by default and for empty / falsey strings', () => {
    expect(parseGodotShoreFlag(undefined)).toBe(false);
    expect(parseGodotShoreFlag('')).toBe(false);
    expect(parseGodotShoreFlag('0')).toBe(false);
    expect(parseGodotShoreFlag('false')).toBe(false);
    expect(parseGodotShoreFlag('no')).toBe(false);
  });

  it('accepts 1 / true / yes / on (case-insensitive)', () => {
    expect(parseGodotShoreFlag('1')).toBe(true);
    expect(parseGodotShoreFlag('true')).toBe(true);
    expect(parseGodotShoreFlag('YES')).toBe(true);
    expect(parseGodotShoreFlag('On')).toBe(true);
  });
});

describe('parseGodotMessage', () => {
  it('accepts a valid ready envelope', () => {
    const msg = parseGodotMessage({
      channel: BRIDGE_CHANNEL,
      v: BRIDGE_V,
      type: 'ready',
      payload: { sceneId: 'dba.scene.shore', buildId: 'a1' },
    });
    expect(msg).toEqual({
      channel: BRIDGE_CHANNEL,
      v: BRIDGE_V,
      type: 'ready',
      payload: { sceneId: 'dba.scene.shore', buildId: 'a1' },
    });
  });

  it('accepts spotAction and exitShore gate/depart', () => {
    expect(
      parseGodotMessage({
        channel: BRIDGE_CHANNEL,
        v: BRIDGE_V,
        type: 'spotAction',
        payload: { id: 'island-gourd' },
      }),
    ).toMatchObject({ type: 'spotAction', payload: { id: 'island-gourd' } });

    expect(
      parseGodotMessage({
        channel: BRIDGE_CHANNEL,
        v: BRIDGE_V,
        type: 'exitShore',
        payload: { reason: 'gate', to: 'dba.scene.camp' },
      }),
    ).toMatchObject({ type: 'exitShore', payload: { reason: 'gate', to: 'dba.scene.camp' } });
  });

  it('ignores wrong channel, version, type, or malformed payload', () => {
    expect(parseGodotMessage(null)).toBeNull();
    expect(parseGodotMessage({ channel: 'other', v: 1, type: 'ready', payload: { sceneId: 'x' } })).toBeNull();
    expect(
      parseGodotMessage({ channel: BRIDGE_CHANNEL, v: 99, type: 'ready', payload: { sceneId: 'x' } }),
    ).toBeNull();
    expect(
      parseGodotMessage({ channel: BRIDGE_CHANNEL, v: BRIDGE_V, type: 'ready', payload: {} }),
    ).toBeNull();
    expect(
      parseGodotMessage({
        channel: BRIDGE_CHANNEL,
        v: BRIDGE_V,
        type: 'spotAction',
        payload: { id: '' },
      }),
    ).toBeNull();
    expect(
      parseGodotMessage({
        channel: BRIDGE_CHANNEL,
        v: BRIDGE_V,
        type: 'exitShore',
        payload: { reason: 'warp' },
      }),
    ).toBeNull();
  });

  it('builds shell envelopes with channel + v', () => {
    const msg = envelope('pause', { reason: 'overlay' as const });
    expect(msg).toEqual({
      channel: BRIDGE_CHANNEL,
      v: BRIDGE_V,
      type: 'pause',
      payload: { reason: 'overlay' },
    });
  });

  it('packs a save slice without place / full SaveData', () => {
    const slice = saveSliceFrom({
      currentScene: 'dba.scene.shore',
      beats: { 'dba.beat.water': true },
      flags: { 'dba.flag.driftwood': true },
      companion: { level: 0, targetId: null, pawUsed: false },
      settings: { showGloss: false },
      feedback: { kind: 'ok', spot: 'island-gourd', line: 'spot.gourd.ok' },
    });
    expect(slice.currentScene).toBe('dba.scene.shore');
    expect(slice.beats?.['dba.beat.water']).toBe(true);
    expect(slice.feedback).toEqual({ kind: 'ok', spot: 'island-gourd', line: 'spot.gourd.ok' });
    expect(slice).not.toHaveProperty('place');
    expect(slice).not.toHaveProperty('words');
  });
});
