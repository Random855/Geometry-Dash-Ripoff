import { Level, Obstacle } from './types';

const createSpike = (x: number, y: number): Obstacle => ({
  type: 'SPIKE',
  pos: { x, y },
  width: 40,
  height: 40,
});

const createBlock = (x: number, y: number): Obstacle => ({
  type: 'BLOCK',
  pos: { x, y },
  width: 40,
  height: 40,
});

export const LEVELS: Level[] = [
  {
    id: '1',
    name: 'Stereo Madness',
    length: 5000,
    obstacles: [
      createSpike(600, 0),
      createSpike(900, 0),
      createSpike(1200, 0),
      createSpike(1240, 0),
      
      createBlock(1520, 0),
      createBlock(1560, 0),
      createBlock(1600, 0),
      createBlock(1640, 0),
      createBlock(1680, 0),
      
      createSpike(1800, 0),
      createSpike(1840, 0),
      
      createBlock(2200, 40),
      createBlock(2240, 40),
      createBlock(2280, 40),
      createSpike(2240, 80),

      createSpike(2600, 0),
      createSpike(2640, 0),
      
      createBlock(3000, 0),
      createBlock(3040, 40),
      createBlock(3080, 80),
      createSpike(3120, 0),
      
      createSpike(3500, 0),
      createSpike(3550, 0),
      
      createBlock(4000, 0),
      createBlock(4040, 0),
      createBlock(4080, 0),
      createBlock(4120, 0),
      createSpike(4160, 0),
    ],
  },
];
