import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { type IslandScene } from './core/island';
import { reduce } from './core/reduce';
import { newGameState } from './core/save';
import { groundStep } from './core/navigation';
import { BANDS, SPOTS, gateAt } from './core/stage';
import { stepKey, type Point, type WalkKey } from './core/walk';
import { SAVE_KEY } from './platform/storage';
import { useGame } from './stores/gameStore';
import { MuralScreen } from './ui/MuralScreen';
import { PrologueScreen } from './ui/PrologueScreen';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
  useGame.getState().resetForTests();
});

async function ready() {
  await waitFor(() => expect(screen.getByTestId('walk-stage').dataset.display).toBe('ready'));
}

async function press(keys: readonly string[]) {
  await ready();
  for (const key of keys) fireEvent.keyDown(window, { key });
}

function here(): Point {
  const el = screen.getByTestId('traveler');
  return { x: Number(el.getAttribute('data-x')), y: Number(el.getAttribute('data-y')) };
}

async function walkTo(scene: IslandScene, goal: Point, radius: number) {
  await ready();
  // Find a route for discrete test key presses. The old straight-line helper
  // walked through props; each candidate now uses the actual collision step.
  const queue: { pos: Point; keys: WalkKey[] }[] = [{ pos: here(), keys: [] }];
  const visited = new Set<string>();
  for (let i = 0; i < queue.length && i < 10000; i++) {
    const node = queue[i];
    if (Math.hypot(node.pos.x - goal.x, node.pos.y - goal.y) < radius) {
      await press(node.keys);
      expect(Math.hypot(here().x - goal.x, here().y - goal.y)).toBeLessThan(radius + .001);
      return;
    }
    for (const key of ['a', 'd', 'w', 's'] as const) {
      const next = groundStep(scene, node.pos, stepKey(node.pos, key, BANDS[scene]).pos);
      const id = `${next.x.toFixed(5)}:${next.y.toFixed(5)}`;
      if (visited.has(id) || gateAt(scene, next)) continue;
      visited.add(id);
      queue.push({ pos: next, keys: [...node.keys, key] });
    }
  }
  throw new Error(`No keyboard route to ${JSON.stringify(goal)} from ${JSON.stringify(here())}`);
}

function spot(scene: IslandScene, id: string): Point & { r: number } {
  const found = SPOTS[scene].find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

async function cross(to: IslandScene, key: 'a' | 'd' | 'w' | 's') {
  await ready();
  const from = document.querySelector('[data-scene]')?.getAttribute('data-scene');
  // Take the visible sand / forecourt before moving past the solid props.
  const floor = from === 'dba.scene.shore' ? .79 : from === 'dba.scene.yard' ? .925 : null;
  if (floor !== null) for (let i = 0; i < 12 && here().y < floor; i++) fireEvent.keyDown(window, { key: 's' });
  for (let i = 0; i < 48; i += 1) {
    if (document.querySelector('[data-scene]')?.getAttribute('data-scene') === to) { await ready(); return; }
    fireEvent.keyDown(window, { key });
  }
  const scene = document.querySelector('[data-scene]')?.getAttribute('data-scene');
  throw new Error(`did not enter ${to} from ${scene} at ${here().x},${here().y}`);
}

describe('playable slice', async () => {
  it('keeps playing after a failed save, warns the player, and retries on the next action', async () => {
    const saved = reduce(newGameState(), { type: 'new-game' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    useGame.getState().resetForTests();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('prologue').getAttribute('data-prologue-step')).toBe('1');
    expect(screen.getByRole('status').textContent).toContain('暂时无法保存进度');
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).prologueStep).toBe(0);
    write.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).prologueStep).toBe(2);
  });

  it('reaches both yard amount boards from the step by click and keyboard', async () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let i = 0; i < 28; i++) save = reduce(save, { type: 'debug-learn-next' });
    save = reduce(save, { type: 'debug-scene', scene: 'dba.scene.yard' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    fireEvent.click(screen.getByTestId('amount-more'));
    expect(useGame.getState().save.beats['dba.beat.amount']).toBeUndefined();
    await press(['d', 'w']);
    expect(here().y).toBe(0.92);
    expect(screen.getByTestId('walk-stage').getAttribute('data-near')).toContain('act:dba.word.amount:more');
    fireEvent.click(screen.getByTestId('amount-more'));
    expect(useGame.getState().save.beats['dba.beat.amount']).toBe(true);
    expect(screen.getByTestId('amount-more').getAttribute('data-result')).toBe('ok');
    await press(['d', 'd', 'e']);
    expect(here().y).toBe(0.92);
    expect(useGame.getState().save.feedback.spot).toBe('act:dba.word.amount:less');
    expect(useGame.getState().save.feedback.kind).toBe('no');
  });

  it('starts with teaching glosses off and can learn water, then use it', async () => {
    render(<App />);
    expect(screen.getByRole('switch', { name: '显示教学义' }).getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    await ready();
    expect(screen.getByTestId('traveler')).toBeTruthy();
    expect(screen.queryByText('奈奈茶')).toBeNull();
    fireEvent.click(screen.getByTestId('island-mural'));
    expect(screen.getByTestId('shore')).toBeTruthy();
    expect(useGame.getState().save.screen).toBe('island');

    const mural = spot('dba.scene.shore', 'island-mural');
    await walkTo('dba.scene.shore', mural, mural.r);
    expect(screen.getByTestId('walk-stage').getAttribute('data-near')).toContain('island-mural');
    fireEvent.click(screen.getByTestId('island-mural'));

    expect(screen.queryByText('太阳')).toBeNull();
    expect(screen.queryByText('水')).toBeNull();

    fireEvent.click(screen.getByTestId('cell-dba.word.water'));
    fireEvent.click(screen.getByTestId('object-dba.word.water'));
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    const gourd = spot('dba.scene.shore', 'island-gourd');
    await walkTo('dba.scene.shore', gourd, gourd.r);
    fireEvent.click(screen.getByTestId('island-gourd'));
    fireEvent.click(screen.getByTestId('use-dba.word.water'));

    expect(screen.getByTestId('shore').getAttribute('data-water-beat')).toBe('done');
    expect(useGame.getState().save.beats['dba.beat.water']).toBe(true);
    expect(useGame.getState().save.words['dba.word.water'].state).toBe('learned');
  });

  it('continues a saved prologue after reload', async () => {
    const saved = reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'advance-prologue' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    useGame.getState().resetForTests();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    expect(screen.getByTestId('prologue').getAttribute('data-prologue-step')).toBe('1');
  });

  it('opens the camp, the case slots, and the review band', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    await ready();

    fireEvent.click(screen.getByRole('button', { name: '案卷' }));
    expect(screen.getByText('签署手势')).toBeTruthy();
    expect(screen.getByTestId('case-dba.ev.b').getAttribute('data-held')).toBe('no');
    expect(screen.getByTestId('case-dba.ev.main').getAttribute('data-held')).toBe('no');
    expect(screen.queryByTestId('evidence-closeup')).toBeNull();
    expect(screen.queryByText('奈奈茶')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '合上' }));

    await cross('dba.scene.camp', 'd');
    expect(screen.getByTestId('scene').getAttribute('data-scene')).toBe('dba.scene.camp');
    expect(screen.getByTestId('traveler')).toBeTruthy();
    expect(screen.getByTestId('camp-sleep')).toBeTruthy();
    expect(screen.queryByTestId('island-gourd')).toBeNull();
    expect(screen.queryByTestId('nav-camp')).toBeNull();

    await cross('dba.scene.shore', 'a');
    const mural = spot('dba.scene.shore', 'island-mural');
    await walkTo('dba.scene.shore', mural, mural.r);
    fireEvent.click(screen.getByTestId('island-mural'));
    expect(screen.getByTestId('mural-review').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByTestId('cell-dba.word.water'));
    fireEvent.click(screen.getByTestId('object-dba.word.water'));
    expect(screen.getByTestId('mural-review').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByTestId('cell-dba.word.sun'));
    fireEvent.click(screen.getByTestId('object-dba.word.sun'));
    expect(screen.getByTestId('mural-review').hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByTestId('mural-review'));
    expect(screen.getByTestId('review-dba.word.water')).toBeTruthy();
    expect(screen.queryByText('水')).toBeNull();
  });

  it('shows the Chinese gloss only after the player turns it on', async () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    save = reduce(save, { type: 'open-mural' });
    const { rerender } = render(<MuralScreen save={save} dispatch={() => undefined} />);
    expect(screen.queryByText('水')).toBeNull();
    rerender(
      <MuralScreen
        save={reduce(save, { type: 'set-show-gloss', value: true })}
        dispatch={() => undefined}
      />,
    );
    expect(screen.getAllByText('水').length).toBeGreaterThan(0);
  });

  it('plays the silent memory after leaving and replays it from the map, night, and case', async () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    for (let step = 0; step < 28; step += 1) save = reduce(save, { type: 'debug-learn-next' });
    save = reduce(save, { type: 'use-word', wordId: 'dba.word.water' });
    save = reduce(reduce(save, { type: 'goto-scene', scene: 'dba.scene.camp' }), { type: 'sleep-at-camp' });
    save = reduce(reduce(save, { type: 'goto-scene', scene: 'dba.scene.yard' }), { type: 'give-fish' });
    save = reduce(reduce(save, { type: 'goto-scene', scene: 'dba.scene.path' }), { type: 'forest-choice', choice: 'stop' });
    save = reduce(save, { type: 'goto-scene', scene: 'dba.scene.shore' });
    save = reduce(save, { type: 'depart' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    expect(screen.getByTestId('depart-plate').getAttribute('data-chart')).toBe('chart.jgw');
    expect(screen.getByTestId('companion').getAttribute('data-pose')).toBe('fetch');
    expect(screen.queryByText('奈奈茶')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('rain');
    expect(screen.getByTestId('still-frame').getAttribute('data-art-id')).toBe('art.mem.rain');
    expect(screen.getByTestId('memory-art').textContent).toBe('');
    expect(screen.getByTestId('memory-plate').querySelector('.nanaicha-look')?.getAttribute('data-figure')).toBe('adult');
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('kitten');
    expect(screen.getAllByTestId('still-frame').some((frame) => frame.getAttribute('data-art-id') === 'art.mem.kitten')).toBe(true);
    expect(screen.getByTestId('memory-plate').querySelector('.nanaicha-look')?.getAttribute('data-figure')).toBe('kitten');
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('cloak');
    expect(screen.getAllByTestId('still-frame').some((frame) => frame.getAttribute('data-art-id') === 'art.mem.cloak')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '合上' }));
    expect(screen.queryByTestId('memory-plate')).toBeNull();

    const closeMemory = () => {
      fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
      fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
      fireEvent.click(screen.getByRole('button', { name: '合上' }));
    };

    fireEvent.click(screen.getByRole('button', { name: '甲骨' }));
    expect(screen.getByTestId('chart-sealed').getAttribute('data-chart')).toBe('chart.jgw');
    expect(screen.getByText('甲骨角尚未开放。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '合上' }));
    expect(screen.queryByTestId('chart-sealed')).toBeNull();

    await cross('dba.scene.camp', 'd');
    await cross('dba.scene.night', 'w');
    const memory = spot('dba.scene.night', 'night-memory');
    await walkTo('dba.scene.night', memory, memory.r);
    fireEvent.click(screen.getByTestId('night-memory'));
    expect(screen.getByTestId('memory-plate')).toBeTruthy();
    closeMemory();

    fireEvent.click(screen.getByRole('button', { name: '案卷' }));
    fireEvent.click(screen.getByTestId('case-memory'));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('rain');
    expect(screen.queryByText('奈奈茶')).toBeNull();
  });

  it('faces front, side, and back while walking', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    await ready();
    const traveler = () => screen.getByTestId('traveler');
    expect(traveler().getAttribute('data-facing')).toBe('front');
    fireEvent.keyDown(window, { key: 'w' });
    expect(traveler().getAttribute('data-facing')).toBe('back');
    fireEvent.keyDown(window, { key: 'd' });
    expect(traveler().getAttribute('data-facing')).toBe('right');
    fireEvent.keyDown(window, { key: 'a' });
    expect(traveler().getAttribute('data-facing')).toBe('left');
    fireEvent.keyDown(window, { key: 's' });
    expect(traveler().getAttribute('data-facing')).toBe('front');
  });

  it('opens a hotspot underfoot with click, E, Enter, Space, and F', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    await ready();

    const mural = spot('dba.scene.shore', 'island-mural');
    for (const key of ['e', 'Enter', ' ', 'f']) {
      await walkTo('dba.scene.shore', mural, mural.r);
      expect(screen.getByTestId('walk-stage').getAttribute('data-near')).toContain('island-mural');
      fireEvent.keyDown(window, { key });
      expect(screen.getByTestId('mural-review')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '返回' }));
      expect(screen.getByTestId('shore')).toBeTruthy();
    }

    act(() => {
      useGame.getState().dispatch({ type: 'debug-scene', scene: 'dba.scene.night' });
    });
    expect(screen.getByTestId('scene').getAttribute('data-scene')).toBe('dba.scene.night');
    const read = spot('dba.scene.night', 'night-read');
    await walkTo('dba.scene.night', read, read.r);
    expect(screen.getByTestId('walk-stage').getAttribute('data-near')).toContain('night-read');
    fireEvent.click(screen.getByTestId('night-read'));
    expect(screen.getByTestId('mural-review')).toBeTruthy();
    expect(useGame.getState().save.evidence).not.toContain('dba.ev.main');
    expect(useGame.getState().save.currentScene).toBe('dba.scene.night');
    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await walkTo('dba.scene.night', read, read.r);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByTestId('mural-review')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    const learned = ['dba.word.hunger', 'dba.word.promise', 'dba.word.danger'].reduce(
      (next, id) => ({
        ...next,
        words: {
          ...next.words,
          [id]: { ...next.words[id], state: 'learned' as const, correct: next.words[id].correct + 1 },
        },
      }),
      useGame.getState().save,
    );
    act(() => {
      useGame.setState({ save: learned });
    });
    await walkTo('dba.scene.night', read, read.r);
    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByRole('dialog', { name: '案卷' })).toBeTruthy();
    expect(useGame.getState().save.evidence).toContain('dba.ev.main');
    expect(screen.getByTestId('evidence-closeup').getAttribute('src')).toMatch(/art\.ev\.main\.closeup/);
    expect(useGame.getState().save.beats['dba.beat.old-layer']).toBe(true);
  });

  it('keeps the collar dark until the rope-knot evidence is in the case', async () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    expect(screen.getByTestId('companion').getAttribute('data-knot')).toBe('rest');
    first.unmount();

    save = reduce(save, { type: 'debug-evidence', id: 'dba.ev.b' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    if (screen.queryByTestId('walk-stage')) await ready();
    expect(screen.getByTestId('companion').getAttribute('data-knot')).toBe('glow');
    expect(screen.queryByText('奈奈茶')).toBeNull();
  });

  it('teaches approach once, on the driftwood', async () => {
    // shore：出生约两秒内能指 漂木 + 水瓢。教程只挂 shore-driftwood，写 taught-approach 后不再弹。
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    await ready();
    expect(screen.queryByTestId('approach-hint')).toBeNull();
    expect(screen.getByTestId('prop-art.shore.prop.driftwood')).toBeTruthy();
    expect(screen.getByTestId('prop-art.shore.prop.gourd')).toBeTruthy();
    expect(screen.queryByText('?')).toBeNull();

    const wood = spot('dba.scene.shore', 'shore-driftwood');
    await walkTo('dba.scene.shore', wood, wood.r);
    expect(screen.getByTestId('approach-hint').textContent).toBe('近一点。手才能够到。');
    expect(useGame.getState().save.flags['dba.flag.taught-approach']).toBe(true);

    await walkTo('dba.scene.shore', { x: 0.42, y: 0.62 }, 0.02);
    expect(screen.queryByTestId('approach-hint')).toBeNull();
    await walkTo('dba.scene.shore', wood, wood.r);
    expect(screen.queryByTestId('approach-hint')).toBeNull();
  });

  it('steps the four prologue stills with the caption and no second cat', async () => {
    const frames = [
      ['art.pro.storm', '浪头吞没了船。 你攥住一块浮木，耳边只剩风声。', '下一幕'],
      ['art.pro.dark', '一声猫叫，穿过黑水。 你还没想清楚，手已经伸了出去。', '下一幕'],
      ['art.pro.break', '闪回里，长卷上的符裂开了。 那只做出「断」的手……为什么像你自己的？', '下一幕'],
      ['art.pro.tide', '醒来时，那只猫守在潮线上。 她回头望了你一眼，向石门走去。', '走上潮线'],
    ] as const;
    const view = render(<PrologueScreen step={0} onAdvance={() => undefined} />);
    for (const [art, caption, button] of frames) {
      const step = frames.findIndex((item) => item[0] === art);
      view.rerender(<PrologueScreen step={step} onAdvance={() => undefined} />);
      const prologue = screen.getByTestId('prologue');
      expect(prologue.getAttribute('data-still')).toBe(art);
      expect(screen.getByTestId('still-frame').getAttribute('data-art-id')).toBe(art);
      expect(prologue.querySelectorAll('[data-testid="still-frame"]')).toHaveLength(1);
      expect(prologue.querySelector('.nanaicha-look')).toBeNull();
      expect(prologue.querySelector('[data-caption]')?.getAttribute('data-caption')).toBe(
        art === 'art.pro.storm' ? 'prologue.0' : art === 'art.pro.dark' ? 'prologue.1' : art === 'art.pro.break' ? 'prologue.2' : 'prologue.3',
      );
      expect(screen.getByText(caption)).toBeTruthy();
      expect(screen.getByRole('button', { name: button })).toBeTruthy();
    }
    view.unmount();
  });
});
