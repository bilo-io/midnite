import { describe, expect, it } from 'vitest';

import {
  BREAKOUT,
  createBreakout,
  stepBreakout,
  type BreakoutInput,
  type BreakoutState,
} from './breakout';

const NO_INPUT: BreakoutInput = { left: false, right: false, fire: false, launch: false };
const input = (over: Partial<BreakoutInput> = {}): BreakoutInput => ({ ...NO_INPUT, ...over });

describe('createBreakout', () => {
  it('starts ready with a full brick grid, one resting ball, and full lives', () => {
    const s = createBreakout();
    expect(s.status).toBe('ready');
    expect(s.bricks).toHaveLength(BREAKOUT.brickCols * BREAKOUT.brickRows);
    expect(s.bricks.every((b) => b.alive)).toBe(true);
    expect(s.balls).toHaveLength(1);
    expect(s.balls[0]!.vx).toBe(0);
    expect(s.lives).toBe(BREAKOUT.lives);
  });
});

describe('launch + paddle', () => {
  it('launches the ball upward on input.launch', () => {
    const s = createBreakout();
    stepBreakout(s, 1 / 60, input({ launch: true }));
    expect(s.status).toBe('playing');
    expect(s.balls[0]!.vy).toBeLessThan(0); // moving up
  });

  it('moves the paddle right and clamps it inside the field', () => {
    const s = createBreakout();
    for (let i = 0; i < 300; i++) stepBreakout(s, 1 / 60, input({ right: true }));
    expect(s.paddleX).toBeLessThanOrEqual(BREAKOUT.width - s.paddleW / 2 + 1e-6);
    expect(s.paddleX).toBeGreaterThan(BREAKOUT.width / 2);
  });

  it('reflects a falling ball upward off the paddle', () => {
    const s = createBreakout();
    s.status = 'playing';
    s.bricks.forEach((b) => (b.alive = false)); // isolate the paddle bounce
    s.bricks.push({ x: 0, y: 0, w: 1, h: 1, alive: true, color: 0 }); // keep 1 so it doesn't win
    s.balls = [{ x: s.paddleX, y: BREAKOUT.paddleY - 2, vx: 0, vy: 120 }];
    stepBreakout(s, 1 / 60, input());
    expect(s.balls[0]!.vy).toBeLessThan(0);
  });
});

describe('bricks + scoring', () => {
  it('breaks a brick the ball overlaps and awards points', () => {
    const s = createBreakout();
    s.status = 'playing';
    const brick = s.bricks[0]!;
    s.balls = [{ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vx: 0, vy: -100 }];
    const before = s.bricks.filter((b) => b.alive).length;
    stepBreakout(s, 1 / 60, input());
    expect(s.bricks.filter((b) => b.alive).length).toBe(before - 1);
    expect(s.score).toBe(10);
  });

  it('wins when the last brick is cleared', () => {
    const s = createBreakout();
    s.status = 'playing';
    const brick = s.bricks[0]!;
    s.bricks = [brick];
    s.balls = [{ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vx: 0, vy: -100 }];
    stepBreakout(s, 1 / 60, input());
    expect(s.status).toBe('won');
    expect(s.best).toBeGreaterThanOrEqual(s.score);
  });
});

describe('lives + game over', () => {
  it('loses a life and re-racks the ball when it falls past the bottom', () => {
    const s = createBreakout();
    s.status = 'playing';
    s.balls = [{ x: 100, y: BREAKOUT.height + 20, vx: 0, vy: 200 }];
    stepBreakout(s, 1 / 60, input());
    expect(s.lives).toBe(BREAKOUT.lives - 1);
    expect(s.status).toBe('ready'); // ball re-racked
  });

  it('ends the game when the last life is lost', () => {
    const s = createBreakout();
    s.status = 'playing';
    s.lives = 1;
    s.score = 40;
    s.balls = [{ x: 100, y: BREAKOUT.height + 20, vx: 0, vy: 200 }];
    stepBreakout(s, 1 / 60, input());
    expect(s.status).toBe('lost');
    expect(s.best).toBe(40);
  });
});

describe('power-ups', () => {
  function withPaddlePowerUp(kind: BreakoutState['powerUps'][number]['kind']): BreakoutState {
    const s = createBreakout();
    s.status = 'playing';
    s.bricks.forEach((b) => (b.alive = false));
    s.bricks.push({ x: 0, y: 0, w: 1, h: 1, alive: true, color: 0 }); // avoid instant win
    // Keep the ball safely in play so no life is lost this step.
    s.balls = [{ x: s.paddleX, y: 100, vx: 0, vy: -50 }];
    s.powerUps = [{ x: s.paddleX, y: BREAKOUT.paddleY, kind }];
    return s;
  }

  it('multi-ball adds balls when caught', () => {
    const s = withPaddlePowerUp('multiball');
    const before = s.balls.length;
    stepBreakout(s, 1 / 60, input());
    expect(s.balls.length).toBeGreaterThan(before);
  });

  it('widen grows the paddle; shrink narrows it', () => {
    const wide = withPaddlePowerUp('widen');
    stepBreakout(wide, 1 / 60, input());
    expect(wide.paddleW).toBe(BREAKOUT.paddleWide);

    const narrow = withPaddlePowerUp('shrink');
    stepBreakout(narrow, 1 / 60, input());
    expect(narrow.paddleW).toBe(BREAKOUT.paddleNarrow);
  });

  it('laser lets the paddle fire and destroy bricks', () => {
    const s = createBreakout();
    s.status = 'playing';
    s.laserTimer = BREAKOUT.effectDuration;
    // A wide brick above the paddle spanning the edge columns the lasers fire from.
    const brick = { x: s.paddleX - 30, y: BREAKOUT.paddleY - 40, w: 60, h: 10, alive: true, color: 0 };
    s.bricks = [brick, { x: 0, y: 0, w: 1, h: 1, alive: true, color: 0 }];
    s.balls = [{ x: s.paddleX, y: 100, vx: 0, vy: -50 }];
    // Fire, then let the laser travel up into the brick over a few frames.
    stepBreakout(s, 1 / 60, input({ fire: true }));
    expect(s.lasers.length).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) stepBreakout(s, 1 / 60, input());
    expect(brick.alive).toBe(false);
  });

  it('drops a power-up deterministically for a given seed', () => {
    // Find a seed that drops on the first brick break, then assert it replays.
    const hit = (seed: number) => {
      const s = createBreakout(seed);
      s.status = 'playing';
      const brick = s.bricks[0]!;
      s.balls = [{ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vx: 0, vy: -100 }];
      stepBreakout(s, 1 / 60, input());
      return s.powerUps.length;
    };
    let seed = 1;
    while (hit(seed) === 0 && seed < 200) seed++;
    expect(hit(seed)).toBe(hit(seed)); // deterministic replay
    expect(hit(seed)).toBeGreaterThan(0);
  });
});

describe('terminal states are frozen', () => {
  it('does not advance once won or lost', () => {
    const s = createBreakout();
    s.status = 'won';
    const snapshot = JSON.stringify(s);
    stepBreakout(s, 1 / 60, input({ left: true, launch: true }));
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
