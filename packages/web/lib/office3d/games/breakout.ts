/**
 * Phase 63 Theme D — a real Breakout/Arkanoid, pure + engine-free. The whole game
 * is a deterministic state machine (`createBreakout` → `stepBreakout`) with **no**
 * canvas or `three` dependency, so every rule — brick collision, paddle bounce,
 * the three power-ups (multi-ball, paddle resize, laser), scoring, lives/win/lose
 * — is unit-testable. The `<BreakoutCabinet>` component owns only the canvas draw
 * + input, calling `stepBreakout` each frame.
 *
 * Coordinates are a fixed logical play field (portrait, to fit a cabinet screen);
 * the renderer scales it to the CanvasTexture. Randomness is a seeded LCG so a
 * given seed replays identically (tests pass a fixed seed).
 */

/** Logical play-field dimensions + tuning (all in field px / px-per-second). */
export const BREAKOUT = {
  width: 240,
  height: 320,
  paddleY: 300,
  paddleH: 8,
  paddleNormal: 48,
  paddleWide: 76,
  paddleNarrow: 30,
  paddleSpeed: 260,
  ballRadius: 4,
  ballSpeed: 210,
  brickCols: 8,
  brickRows: 5,
  brickTop: 46,
  brickH: 14,
  brickGap: 2,
  powerSize: 12,
  powerFall: 95,
  powerDropPct: 22,
  laserSpeed: 340,
  laserCooldown: 0.22,
  effectDuration: 8,
  lives: 3,
  maxBalls: 5,
} as const;

export type PowerKind = 'multiball' | 'widen' | 'shrink' | 'laser';
export type PaddleMode = 'normal' | 'wide' | 'narrow';
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  /** Row-derived colour index (0–4) for the renderer. */
  color: number;
}

export interface PowerUp {
  x: number;
  y: number;
  kind: PowerKind;
}

export interface Laser {
  x: number;
  y: number;
}

export interface BreakoutState {
  status: GameStatus;
  paddleX: number;
  paddleW: number;
  paddleMode: PaddleMode;
  balls: Ball[];
  bricks: Brick[];
  powerUps: PowerUp[];
  lasers: Laser[];
  score: number;
  lives: number;
  best: number;
  /** Remaining seconds on the widen/narrow effect (0 = normal). */
  paddleTimer: number;
  /** Remaining seconds the paddle can fire lasers (0 = disabled). */
  laserTimer: number;
  /** Cooldown before the next laser volley. */
  fireCooldown: number;
  /** LCG state — advanced on every random draw. */
  rng: number;
}

export interface BreakoutInput {
  left: boolean;
  right: boolean;
  fire: boolean;
  /** Rising edge that launches a resting ball. */
  launch: boolean;
}

const POWER_KINDS: PowerKind[] = ['multiball', 'widen', 'shrink', 'laser'];

/** Deterministic LCG → [0, 1); returns the new seed + value so callers stay pure. */
function rand(seed: number): { seed: number; value: number } {
  const next = (seed * 1103515245 + 12345) & 0x7fffffff;
  return { seed: next, value: next / 0x7fffffff };
}

/** Build the brick grid — five rows of eight, coloured by row. */
function buildBricks(): Brick[] {
  const { width, brickCols, brickRows, brickTop, brickH, brickGap } = BREAKOUT;
  const w = width / brickCols;
  const bricks: Brick[] = [];
  for (let row = 0; row < brickRows; row++) {
    for (let col = 0; col < brickCols; col++) {
      bricks.push({
        x: col * w + brickGap / 2,
        y: brickTop + row * (brickH + brickGap),
        w: w - brickGap,
        h: brickH,
        alive: true,
        color: row,
      });
    }
  }
  return bricks;
}

/** Fresh game — one ball resting on the paddle, ready to launch. */
export function createBreakout(seed = 1, best = 0): BreakoutState {
  const paddleX = BREAKOUT.width / 2;
  return {
    status: 'ready',
    paddleX,
    paddleW: BREAKOUT.paddleNormal,
    paddleMode: 'normal',
    balls: [{ x: paddleX, y: BREAKOUT.paddleY - BREAKOUT.ballRadius, vx: 0, vy: 0 }],
    bricks: buildBricks(),
    powerUps: [],
    lasers: [],
    score: 0,
    lives: BREAKOUT.lives,
    best,
    paddleTimer: 0,
    laserTimer: 0,
    fireCooldown: 0,
    rng: seed & 0x7fffffff || 1,
  };
}

function resetPaddle(s: BreakoutState): void {
  s.paddleMode = 'normal';
  s.paddleW = BREAKOUT.paddleNormal;
  s.paddleTimer = 0;
}

/** Put a single ball back on the paddle after a life is lost. */
function restBall(s: BreakoutState): void {
  s.balls = [{ x: s.paddleX, y: BREAKOUT.paddleY - BREAKOUT.ballRadius, vx: 0, vy: 0 }];
  s.status = 'ready';
}

function launchBall(s: BreakoutState): void {
  const angle = -Math.PI / 3; // up-right at 60°
  s.balls[0]!.vx = Math.cos(angle) * BREAKOUT.ballSpeed;
  s.balls[0]!.vy = Math.sin(angle) * BREAKOUT.ballSpeed;
  s.status = 'playing';
}

function applyPowerUp(s: BreakoutState, kind: PowerKind): void {
  switch (kind) {
    case 'multiball': {
      const source = s.balls.filter((b) => b.vy !== 0 || b.vx !== 0);
      const seeds = source.length > 0 ? source : s.balls;
      for (const b of seeds) {
        if (s.balls.length >= BREAKOUT.maxBalls) break;
        s.balls.push({ x: b.x, y: b.y, vx: -b.vx || BREAKOUT.ballSpeed * 0.5, vy: b.vy || -BREAKOUT.ballSpeed });
      }
      break;
    }
    case 'widen':
      s.paddleMode = 'wide';
      s.paddleW = BREAKOUT.paddleWide;
      s.paddleTimer = BREAKOUT.effectDuration;
      break;
    case 'shrink':
      s.paddleMode = 'narrow';
      s.paddleW = BREAKOUT.paddleNarrow;
      s.paddleTimer = BREAKOUT.effectDuration;
      break;
    case 'laser':
      s.laserTimer = BREAKOUT.effectDuration;
      break;
  }
}

/** Reflect a ball off a brick by the smaller-penetration axis, and score it. */
function hitBrick(s: BreakoutState, ball: Ball, brick: Brick): void {
  brick.alive = false;
  s.score += 10;
  const overlapX = Math.min(ball.x + BREAKOUT.ballRadius - brick.x, brick.x + brick.w - (ball.x - BREAKOUT.ballRadius));
  const overlapY = Math.min(ball.y + BREAKOUT.ballRadius - brick.y, brick.y + brick.h - (ball.y - BREAKOUT.ballRadius));
  if (overlapX < overlapY) ball.vx = -ball.vx;
  else ball.vy = -ball.vy;
  // Maybe drop a power-up from the brick's centre.
  const r = rand(s.rng);
  s.rng = r.seed;
  if (r.value * 100 < BREAKOUT.powerDropPct) {
    const pick = rand(s.rng);
    s.rng = pick.seed;
    const kind = POWER_KINDS[Math.floor(pick.value * POWER_KINDS.length)] ?? 'multiball';
    s.powerUps.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, kind });
  }
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Advance the game one frame. Mutates + returns `s` (the standard game-loop
 * shape); tests build a fresh state per assertion. `dt` is clamped so a long
 * frame can't tunnel the ball through bricks/walls.
 */
export function stepBreakout(s: BreakoutState, dt: number, input: BreakoutInput): BreakoutState {
  if (s.status === 'won' || s.status === 'lost') return s;
  const step = Math.min(dt, 1 / 30);
  const { width, height, paddleY, paddleH, ballRadius } = BREAKOUT;

  // Paddle movement (clamped to the field).
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  s.paddleX = Math.max(s.paddleW / 2, Math.min(width - s.paddleW / 2, s.paddleX + dir * BREAKOUT.paddleSpeed * step));

  // Effect timers.
  if (s.paddleTimer > 0) {
    s.paddleTimer -= step;
    if (s.paddleTimer <= 0) resetPaddle(s);
  }
  if (s.laserTimer > 0) s.laserTimer = Math.max(0, s.laserTimer - step);
  if (s.fireCooldown > 0) s.fireCooldown = Math.max(0, s.fireCooldown - step);

  if (s.status === 'ready') {
    // Ball rides the paddle until launched.
    s.balls[0]!.x = s.paddleX;
    s.balls[0]!.y = paddleY - ballRadius;
    if (input.launch) launchBall(s);
    return s;
  }

  // Lasers: fire + travel + hit bricks.
  if (input.fire && s.laserTimer > 0 && s.fireCooldown <= 0) {
    s.lasers.push({ x: s.paddleX - s.paddleW / 2 + 3, y: paddleY });
    s.lasers.push({ x: s.paddleX + s.paddleW / 2 - 3, y: paddleY });
    s.fireCooldown = BREAKOUT.laserCooldown;
  }
  for (const laser of s.lasers) laser.y -= BREAKOUT.laserSpeed * step;
  for (const laser of s.lasers) {
    for (const brick of s.bricks) {
      if (!brick.alive) continue;
      if (overlaps(laser.x - 1, laser.y - 6, 2, 6, brick.x, brick.y, brick.w, brick.h)) {
        brick.alive = false;
        s.score += 10;
        laser.y = -100; // consume the laser
        break;
      }
    }
  }
  s.lasers = s.lasers.filter((l) => l.y > -10);

  // Balls: integrate + collide.
  for (const ball of s.balls) {
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    // Walls.
    if (ball.x - ballRadius < 0) {
      ball.x = ballRadius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ballRadius > width) {
      ball.x = width - ballRadius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ballRadius < 0) {
      ball.y = ballRadius;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle — reflect up, with angle set by where it hits.
    if (
      ball.vy > 0 &&
      overlaps(ball.x - ballRadius, ball.y - ballRadius, ballRadius * 2, ballRadius * 2, s.paddleX - s.paddleW / 2, paddleY, s.paddleW, paddleH)
    ) {
      const rel = (ball.x - s.paddleX) / (s.paddleW / 2); // −1..1
      const angle = rel * (Math.PI / 3); // steer up to ±60°
      const speed = Math.hypot(ball.vx, ball.vy) || BREAKOUT.ballSpeed;
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed);
      ball.y = paddleY - ballRadius;
    }

    // Bricks — at most one per ball per frame (prevents tunnelling).
    for (const brick of s.bricks) {
      if (!brick.alive) continue;
      if (overlaps(ball.x - ballRadius, ball.y - ballRadius, ballRadius * 2, ballRadius * 2, brick.x, brick.y, brick.w, brick.h)) {
        hitBrick(s, ball, brick);
        break;
      }
    }
  }

  // Drop balls that fell past the bottom.
  s.balls = s.balls.filter((b) => b.y - ballRadius <= height);
  if (s.balls.length === 0) {
    s.lives -= 1;
    if (s.lives <= 0) {
      s.status = 'lost';
      s.best = Math.max(s.best, s.score);
      return s;
    }
    restBall(s);
  }

  // Power-ups fall; catch on the paddle.
  for (const p of s.powerUps) p.y += BREAKOUT.powerFall * step;
  const kept: PowerUp[] = [];
  for (const p of s.powerUps) {
    const caught = overlaps(
      p.x - BREAKOUT.powerSize / 2,
      p.y - BREAKOUT.powerSize / 2,
      BREAKOUT.powerSize,
      BREAKOUT.powerSize,
      s.paddleX - s.paddleW / 2,
      paddleY,
      s.paddleW,
      paddleH,
    );
    if (caught) applyPowerUp(s, p.kind);
    else if (p.y - BREAKOUT.powerSize / 2 <= height) kept.push(p);
  }
  s.powerUps = kept;

  // Win when every brick is cleared.
  if (s.bricks.every((b) => !b.alive)) {
    s.status = 'won';
    s.best = Math.max(s.best, s.score);
  }
  return s;
}
