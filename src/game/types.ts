export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  pos: Vector2D;
  vel: Vector2D;
  rotation: number;
  size: number;
  isDead: boolean;
}

export type ObstacleType = 'SPIKE' | 'BLOCK';

export interface Obstacle {
  type: ObstacleType;
  pos: Vector2D;
  width: number;
  height: number;
}

export interface Level {
  id: string;
  name: string;
  obstacles: Obstacle[];
  length: number;
}
