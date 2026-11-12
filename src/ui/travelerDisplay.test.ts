import { describe, expect, it } from 'vitest';
import {
  displaySrc,
  firstScreenTravelerFile,
  heldFrameIndex,
  idleFilesToRequest,
  shouldKeepOutgoingFrame,
} from './travelerDisplay';

describe('traveler first-frame hold (cancel root cause)', () => {
  it('keeps the displayed idle index at 0 until the first frame is ready', () => {
    expect(heldFrameIndex(1, false)).toBe(0);
    expect(heldFrameIndex(0, false)).toBe(0);
    expect(heldFrameIndex(1, true)).toBe(1);
  });

  it('does not request idle-front-02 while the first frame is still loading', () => {
    const files = ['idle-front-01.png', 'idle-front-02.png'];
    expect(idleFilesToRequest(files, 1, false)).toEqual(['idle-front-01.png']);
    expect(idleFilesToRequest(files, 1, true)).toEqual(['idle-front-02.png']);
  });

  it('does not put a mid-flight URL on <img> that will later be replaced', () => {
    expect(displaySrc('idle-front-01.png', null)).toBe('');
    expect(displaySrc('idle-front-01.png', 'blob:ready-or-decoded')).toBe('blob:ready-or-decoded');
  });

  it('keeps the last fully punched src while the next hem-punch is in flight', () => {
    expect(displaySrc('walk-front-02.png', null, null)).toBe('');
    expect(displaySrc('walk-front-02.png', null, 'blob:walk-front-01')).toBe('blob:walk-front-01');
    expect(displaySrc('walk-front-02.png', 'blob:walk-front-02', 'blob:walk-front-01')).toBe('blob:walk-front-02');
  });

  it('does not unmount an outgoing frame that has not finished loading (140ms crossfade would cancel 0B)', () => {
    expect(shouldKeepOutgoingFrame({ outgoingLoading: true, blendElapsedMs: 140 })).toBe(true);
    expect(shouldKeepOutgoingFrame({ outgoingLoading: false, blendElapsedMs: 140 })).toBe(false);
    expect(shouldKeepOutgoingFrame({ outgoingLoading: true, blendElapsedMs: 20 })).toBe(true);
  });

  it('first-screen traveler list is a single static frame, not the idle pair', () => {
    expect(firstScreenTravelerFile()).toBe('idle-front-01.png');
    expect(firstScreenTravelerFile()).not.toContain('02');
  });
});
