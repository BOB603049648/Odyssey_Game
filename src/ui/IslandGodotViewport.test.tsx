import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import type { SaveData } from '../core/schema';
import { IslandScreen } from './IslandScreen';
import { IslandGodotViewport } from './IslandGodotViewport';
import { BRIDGE_CHANNEL, BRIDGE_V, envelope } from '../bridge/godotBridge';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function shoreSave(): SaveData {
  let state = reduce(newGameState(), { type: 'new-game' });
  while (state.screen === 'prologue') {
    state = reduce(state, { type: 'advance-prologue' });
  }
  return state;
}

describe('IslandScreen Godot flag', () => {
  it('does not mount the Godot iframe when VITE_GODOT_SHORE is unset', () => {
    vi.stubEnv('VITE_GODOT_SHORE', '');
    render(<IslandScreen save={shoreSave()} dispatch={() => undefined} onTitle={() => undefined} />);
    expect(screen.queryByTestId('godot-iframe')).toBeNull();
    expect(screen.queryByTestId('godot-viewport')).toBeNull();
    expect(document.querySelector('[data-testid="walk-stage"]')).not.toBeNull();
  });

  it('mounts the Godot iframe on shore when VITE_GODOT_SHORE=1', () => {
    vi.stubEnv('VITE_GODOT_SHORE', '1');
    vi.stubEnv('VITE_GODOT_URL', 'http://47.252.94.138/godot/');
    render(<IslandScreen save={shoreSave()} dispatch={() => undefined} onTitle={() => undefined} />);
    const iframe = screen.getByTestId('godot-iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe('http://47.252.94.138/godot/');
    expect(screen.getByTestId('godot-loading')).toBeTruthy();
    expect(document.querySelector('[data-testid="walk-stage"]')).toBeNull();
  });
});

describe('IslandGodotViewport bridge handlers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GODOT_URL', '/godot/');
  });

  it('toasts 营区未接 on exitShore gate and routes depart to onInteract', () => {
    const onInteract = vi.fn();
    render(<IslandGodotViewport save={shoreSave()} paused={false} onInteract={onInteract} />);
    const iframe = screen.getByTestId('godot-iframe') as HTMLIFrameElement;
    // jsdom iframe has no real contentWindow posting back; synthesize message as if from frame.
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: window,
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            channel: BRIDGE_CHANNEL,
            v: BRIDGE_V,
            type: 'exitShore',
            payload: { reason: 'gate', to: 'dba.scene.camp' },
          },
          origin: window.location.origin,
          source: window,
        }),
      );
    });
    expect(screen.getByTestId('godot-toast').textContent).toBe('营区未接');
    expect(onInteract).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: envelope('exitShore', { reason: 'depart' as const }),
          origin: window.location.origin,
          source: window,
        }),
      );
    });
    expect(onInteract).toHaveBeenCalledWith('shore-depart');
  });

  it('forwards spotAction ids to onInteract', () => {
    const onInteract = vi.fn();
    render(<IslandGodotViewport save={shoreSave()} paused={false} onInteract={onInteract} />);
    const iframe = screen.getByTestId('godot-iframe') as HTMLIFrameElement;
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: window,
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            channel: BRIDGE_CHANNEL,
            v: BRIDGE_V,
            type: 'spotAction',
            payload: { id: 'island-gourd' },
          },
          origin: window.location.origin,
          source: window,
        }),
      );
    });
    expect(onInteract).toHaveBeenCalledWith('island-gourd');
  });
});
