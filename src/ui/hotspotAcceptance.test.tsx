import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SCENE_ASSEMBLIES } from '../content/catalog';
import { BANDS, GATES, SPAWNS, SPOTS } from '../core/stage';
import { PlateStack, drawsInFront } from './Plate';

/**
 * 编导写死的场景验收句：
 * - shore：出生约两秒内能指 漂木 + 水瓢
 * - camp：火旁过夜铺可读 + 北缝始终可进 night
 * - yard：粮袋 / 鱼干 / 多/少木牌 三件同屏可读
 * 热区锚在独立 props，不靠整板像素，也不靠问号贴纸。
 */

afterEach(() => {
  cleanup();
});

function kit(id: string) {
  const found = SCENE_ASSEMBLIES.find((scene) => scene.id === id);
  if (!found) throw new Error(id);
  return found;
}

function prop(id: string, scene: string) {
  return kit(scene).slots.find((slot) => slot.id === id);
}

describe('hotspot acceptance', () => {
  it('anchors every shore, camp, and yard spot on its own prop', () => {
    const shore = [
      ['shore-driftwood', 'art.shore.prop.driftwood', 0.33, 0.72, 0.05],
      ['shore-stone', 'art.shore.prop.break-shard', 0.18, 0.7, 0.05],
      ['island-gourd', 'art.shore.prop.gourd', 0.58, 0.66, 0.11],
      ['island-mural', 'art.shore.prop.mural-wall', 0.3, 0.5, 0.09],
      ['shore-depart', 'art.shore.prop.east-gap', 0.74, 0.68, 0.05],
    ] as const;
    expect(SPOTS['dba.scene.shore']).toHaveLength(5);
    for (const [spotId, artId, x, y, r] of shore) {
      const spot = SPOTS['dba.scene.shore'].find((item) => item.id === spotId);
      expect(spot).toMatchObject({ x, y, r });
      const slot = prop(artId, 'dba.scene.shore');
      expect(slot?.slot).toBe('props');
      expect(slot?.spot).toBe(spotId);
      expect(slot?.x).toBe(x);
      expect(slot?.y).toBe(y);
    }
    const wood = prop('art.shore.prop.driftwood', 'dba.scene.shore');
    const gourd = prop('art.shore.prop.gourd', 'dba.scene.shore');
    const gap = prop('art.shore.prop.east-gap', 'dba.scene.shore');
    expect(wood && gourd && wood.x! < gourd.x!).toBe(true);
    expect(gap?.slot).toBe('props');
    expect(kit('dba.scene.shore').slots.find((slot) => slot.slot === 'sky')?.id).not.toBe('art.shore.prop.east-gap');
    const gate = prop('art.shore.building', 'dba.scene.shore');
    expect(gate).toMatchObject({ x: 0.16, y: 0.42, w: 0.48, h: 0.36 });
    expect((gate?.y ?? 0) + (gate?.h ?? 0) / 2).toBeCloseTo(0.6);

    expect(SPOTS['dba.scene.camp']).toHaveLength(8);
    expect(prop('art.camp.prop.fire', 'dba.scene.camp')?.spot).toBe('camp-sleep');
    expect(prop('art.camp.prop.sleep-mat', 'dba.scene.camp')?.spot).toBe('camp-sleep');
    expect(prop('art.camp.prop.north-curtain', 'dba.scene.camp')?.slot).toBe('props');
    for (const id of ['home', 'eat', 'drink', 'walk', 'take', 'me', 'you']) {
      expect(prop(`art.camp.prop.act-${id}`, 'dba.scene.camp')?.spot).toBe(`act:dba.word.${id}`);
    }
    const night = GATES.find((gate) => gate.from === 'dba.scene.camp' && gate.to === 'dba.scene.night');
    expect(night).toMatchObject({ x: 0.5, y: 0.8, r: 0.04, edge: 'north' });

    expect(SPOTS['dba.scene.yard']).toHaveLength(6);
    expect(prop('art.yard.prop.grain-bags', 'dba.scene.yard')?.spot).toBe('yard-give');
    expect(prop('art.yard.prop.dried-fish', 'dba.scene.yard')?.kind).toBe('dried-fish');
    expect(prop('art.yard.prop.more-less-boards', 'dba.scene.yard')?.spot).toBe('act:dba.word.amount:more');
    expect(prop('art.yard.prop.more-less-boards.less', 'dba.scene.yard')?.spot).toBe('act:dba.word.amount:less');
    const give = SPOTS['dba.scene.yard'].find((item) => item.id === 'yard-give');
    const grab = SPOTS['dba.scene.yard'].find((item) => item.id === 'yard-grab');
    expect(give && grab && grab.x < give.x).toBe(true);
    for (const id of ['art.yard.prop.dried-fish', 'art.yard.prop.dried-fish.small']) {
      expect(prop(id, 'dba.scene.yard')?.y).toBeGreaterThanOrEqual(BANDS['dba.scene.yard'].minY);
    }

    for (const scene of ['dba.scene.shore', 'dba.scene.camp', 'dba.scene.yard'] as const) {
      const band = BANDS[scene];
      expect(SPAWNS[scene].y).toBeGreaterThanOrEqual(band.minY);
      for (const spot of SPOTS[scene]) {
        expect(spot.x).toBeGreaterThanOrEqual(band.minX);
        expect(spot.x).toBeLessThanOrEqual(band.maxX);
        expect(spot.y).toBeGreaterThanOrEqual(band.minY);
        expect(spot.y).toBeLessThanOrEqual(band.maxY);
      }
    }
  });

  it('lights only the prop you have walked up to', () => {
    const { container } = render(
      <PlateStack plate="dba.scene.shore" previous={null} near={['shore-driftwood']} activeSpots={null} cam={{ x: 40, y: 0 }} />,
    );
    expect(container.querySelector('.plate-photo')).toBeNull();
    expect(container.querySelector('[data-assembly="slots"]')?.getAttribute('data-legacy-plate')).toBe('shore.jpg');
    const wood = screen.getByTestId('prop-art.shore.prop.driftwood');
    const gourd = screen.getByTestId('prop-art.shore.prop.gourd');
    expect(wood.getAttribute('data-cue')).toBe('near');
    expect(wood.getAttribute('data-placeholder')).toBe('art');
    expect(gourd.getAttribute('data-cue')).toBe('far');
    expect(gourd.querySelector('img')).toBeTruthy();
    const gap = screen.getByTestId('prop-art.shore.prop.east-gap');
    expect(gap.getAttribute('data-slot')).toBe('props');
    expect(gap.getAttribute('data-spot')).toBe('shore-depart');
    expect(gap.getAttribute('data-anchor')).toBe('foot');
    expect(gap.style.transform).toContain('translate(-50%, -100%)');
    expect(prop('art.camp.prop.fire', 'dba.scene.camp')?.y).toBeGreaterThanOrEqual(0.8);
    expect(prop('art.yard.prop.grain-bags', 'dba.scene.yard')?.y).toBeGreaterThanOrEqual(0.88);
    expect(gap.getAttribute('data-placeholder')).toBe('art');
    expect(gap.querySelector('img')).toBeTruthy();
    expect(container.textContent).not.toContain('?');
    const sky = screen.getByTestId('slot-sky');
    expect(sky.style.transform).toMatch(/translate3d\(31\.2/);
    expect(wood.getAttribute('data-anchor')).toBe('foot');
    expect(wood.style.transform).toContain('translate(-50%, -100%)');
    expect(wood.getAttribute('data-shadow')).toBe('png');
    expect(wood.querySelector('[data-testid="prop-contact"]')).toBeNull();
    const shard = screen.getByTestId('prop-art.shore.prop.break-shard');
    expect(shard.getAttribute('data-anchor')).toBe('foot');
    expect(shard.getAttribute('data-shadow')).toBe('none');
    expect(shard.querySelector('[data-testid="prop-contact"]')).toBeNull();
    expect(gourd.getAttribute('data-shadow')).toBe('png');
    expect(gourd.querySelector('[data-testid="prop-contact"]')).toBeNull();
    expect(gourd.style.transform).toContain('translate(-50%, -100%)');
    const building = screen.getByTestId('slot-building');
    expect(building.getAttribute('data-anchor')).toBe('foot');
    expect(building.style.transform).toContain('translate(-50%, -100%)');
    expect(building.style.transform).not.toContain('translate(-50%, -50%)');
    expect(container.querySelector('.ground-plane')).toBeNull();
    expect(container.querySelector('.ground-walk')).toBeNull();
    expect(container.querySelector('.ambient-water')).toBeNull();
    expect(screen.getByTestId('slot-ground').style.bottom).toBe('-22%');
    const props = container.querySelectorAll('[data-interactable="yes"]');
    expect(props.length).toBe(5);
  });

  it('lights the prop that just answered and leaves the others dark', () => {
    render(<PlateStack plate="dba.scene.shore" previous={null} beat={{ spot: 'shore-driftwood', kind: 'ok' }} />);
    expect(screen.getByTestId('prop-art.shore.prop.driftwood').getAttribute('data-result')).toBe('ok');
    expect(screen.getByTestId('prop-art.shore.prop.gourd').hasAttribute('data-result')).toBe(false);
    expect(screen.getByTestId('prop-art.shore.prop.driftwood').textContent).not.toContain('?');
  });

  it('shows the camp mat and the yard trio as separate props', () => {
    const camp = render(<PlateStack plate="dba.scene.camp" previous={null} />);
    expect(screen.getByTestId('prop-art.camp.prop.sleep-mat').getAttribute('data-spot')).toBe('camp-sleep');
    expect(screen.getByTestId('prop-art.camp.prop.fire').getAttribute('data-spot')).toBe('camp-sleep');
    expect(screen.getByTestId('prop-art.camp.prop.north-curtain').getAttribute('data-kind')).toBe('north-curtain');
    expect(screen.getByTestId('slot-building').getAttribute('data-coplanar')).toBe('yes');
    expect(screen.getByTestId('slot-building').getAttribute('data-anchor')).toBe('foot');
    expect(screen.getByTestId('prop-art.camp.prop.sleep-mat').getAttribute('data-placeholder')).toBe('art');
    expect(screen.getByTestId('prop-art.camp.prop.north-curtain').querySelector('img')).toBeTruthy();
    expect(screen.getByTestId('slot-far').querySelector('img')).toBeTruthy();
    expect(camp.container.querySelector('.plate-photo')).toBeNull();
    expect(camp.container.textContent).not.toContain('?');
    camp.unmount();

    const yard = render(<PlateStack plate="dba.scene.yard" previous={null} />);
    expect(screen.getByTestId('prop-art.yard.prop.grain-bags').getAttribute('data-kind')).toBe('grain-bags');
    expect(screen.getByTestId('prop-art.yard.prop.dried-fish').getAttribute('data-kind')).toBe('dried-fish');
    expect(screen.getByTestId('prop-art.yard.prop.more-less-boards').getAttribute('data-kind')).toBe('more-board');
    expect(screen.getByTestId('prop-art.yard.prop.grain-bags').querySelector('img')).toBeTruthy();
    expect(screen.getByTestId('prop-art.yard.prop.dried-fish').querySelector('img')).toBeTruthy();
    expect(screen.getByTestId('prop-art.yard.prop.more-less-boards').querySelector('img')).toBeTruthy();
    expect(screen.getByTestId('prop-art.yard.prop.grain-bags.grab').querySelector('img')).toBeTruthy();
    expect(yard.container.querySelector('.plate-photo')).toBeNull();
    expect(yard.container.textContent).not.toContain('?');
  });

  it('anchors the hall scrolls, stamps, and wrist knot on their hotspots', () => {
    const view = render(<PlateStack plate="dba.scene.hall" previous={null} />);
    expect(screen.getByTestId('prop-art.hall.prop.scroll-wall').getAttribute('data-spot')).toBe('hall-mural');
    expect(screen.getByTestId('prop-art.hall.prop.stamp-rail').getAttribute('data-spot')).toBe('hall-stamps');
    expect(screen.getByTestId('prop-art.hall.prop.wrist-knot').getAttribute('data-spot')).toBe('hall-tattoo');
    for (const id of [
      'prop-art.hall.prop.scroll-wall',
      'prop-art.hall.prop.stamp-rail',
      'prop-art.hall.prop.wrist-knot',
      'slot-far',
      'slot-ground',
    ]) {
      expect(screen.getByTestId(id).getAttribute('data-placeholder')).toBe('art');
      expect(screen.getByTestId(id).querySelector('img')).toBeTruthy();
    }
    expect(view.container.querySelector('.plate-photo')).toBeNull();
  });

  it('anchors the path danger board and step stones on their hotspots', () => {
    const view = render(<PlateStack plate="dba.scene.path" previous={null} />);
    expect(screen.getByTestId('prop-art.path.prop.danger-board').getAttribute('data-spot')).toBe('path-stop');
    expect(screen.getByTestId('prop-art.path.prop.step-stones').getAttribute('data-spot')).toBe('path-step');
    for (const id of ['prop-art.path.prop.danger-board', 'prop-art.path.prop.step-stones', 'slot-far', 'slot-ground']) {
      expect(screen.getByTestId(id).getAttribute('data-placeholder')).toBe('art');
      expect(screen.getByTestId(id).querySelector('img')).toBeTruthy();
    }
    expect(view.container.querySelector('.plate-photo')).toBeNull();
  });

  it('mounts the night layers on night-read and night-ember', () => {
    // camp：火旁过夜铺可读 + 北缝始终可进 night。旧层热区定稿 night-read，余烬定稿 night-ember，北缝无锁。
    const view = render(<PlateStack plate="dba.scene.night" previous={null} />);
    expect(screen.getByTestId('prop-art.night.prop.old-layer').getAttribute('data-spot')).toBe('night-read');
    expect(screen.getByTestId('prop-art.night.prop.embers').getAttribute('data-spot')).toBe('night-ember');
    expect(screen.getByTestId('prop-art.night.prop.memory-scrap').getAttribute('data-spot')).toBe('night-memory');
    for (const id of [
      'prop-art.night.prop.old-layer',
      'prop-art.night.prop.embers',
      'slot-far',
      'slot-ground',
      'slot-building',
      'slot-fg',
    ]) {
      expect(screen.getByTestId(id).getAttribute('data-placeholder')).toBe('art');
      expect(screen.getByTestId(id).querySelector('img')).toBeTruthy();
    }
    expect(view.container.querySelector('.plate-photo')).toBeNull();
    const night = GATES.find((gate) => gate.from === 'dba.scene.camp' && gate.to === 'dba.scene.night');
    expect(night).toMatchObject({ x: 0.5, y: 0.8, r: 0.04, edge: 'north' });
  });

  it('puts a curtain in front only when the traveler stands north of its hem', () => {
    const campCurtain = prop('art.camp.prop.north-curtain', 'dba.scene.camp');
    const nightCurtain = kit('dba.scene.night').slots.find((slot) => slot.kind === 'curtain');
    expect(campCurtain && nightCurtain).toBeTruthy();
    expect(drawsInFront(campCurtain!, 0.8)).toBe(false);
    expect(drawsInFront(campCurtain!, 0.7)).toBe(true);
    expect(drawsInFront(nightCurtain!, 0.8)).toBe(false);
    expect(drawsInFront(nightCurtain!, 0.66)).toBe(true);

    const south = render(<PlateStack plate="dba.scene.camp" previous={null} pass="near" feetY={0.8} />);
    expect(south.container.querySelector('[data-kind="north-curtain"]')).toBeNull();
    expect(south.container.querySelector('[data-kind="act-you"]')).toBeTruthy();
    south.unmount();

    const north = render(<PlateStack plate="dba.scene.camp" previous={null} pass="back" feetY={0.7} />);
    expect(north.container.querySelector('[data-kind="north-curtain"]')).toBeNull();
    north.unmount();
    const covered = render(<PlateStack plate="dba.scene.night" previous={null} pass="fg" feetY={0.8} />);
    expect(covered.container.querySelector('[data-kind="curtain"]')).toBeNull();
    expect(covered.container.querySelector('[data-slot="fg"]')).toBeNull();
    covered.unmount();
    const behindCloth = render(<PlateStack plate="dba.scene.night" previous={null} pass="near" feetY={0.66} />);
    expect(behindCloth.container.querySelector('[data-kind="curtain"]')).toBeTruthy();
  });
});
