import { expect, it } from 'vitest';
import { newGameState } from './save';
import { puzzleState } from './puzzles';
import { worldState } from './worldState';

it('projects the same puzzle stages for world rendering and gameplay', () => {
  const save = newGameState();
  save.flags['dba.puzzle.water'] = 'filled';
  save.flags['dba.puzzle.food'] = 'allocating';
  save.flags['dba.puzzle.food-self'] = 3;
  const world = worldState(save);
  expect({ water: world.water, food: world.food }).toEqual(puzzleState(save));
  expect(world.water).toBe('filled');
  expect(world.food).toMatchObject({ stage: 'allocating', self: 3, companion: 1 });
  expect(world.rested).toBe(false);
});

it('renders old completed saves as completed even without new puzzle flags', () => {
  const save = newGameState();
  save.beats['dba.beat.water'] = true;
  save.beats['dba.beat.food'] = true;
  save.beats['dba.beat.sleep'] = true;
  expect(worldState(save)).toMatchObject({ water: 'done', food: { stage: 'done', self: 2, companion: 2 }, rested: true });
});
