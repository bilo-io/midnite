'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture } from 'three';

import {
  BREAKOUT,
  createBreakout,
  stepBreakout,
  type BreakoutInput,
  type BreakoutState,
} from '@/lib/office3d/games/breakout';

/**
 * Phase 63 Theme D — the playable Breakout cabinet. The pure game loop
 * ([`breakout.ts`](../../../lib/office3d/games/breakout.ts)) runs each frame while
 * `active`, drawn to an offscreen canvas that backs a `CanvasTexture` on the
 * cabinet screen — so walking up + `E` (which dollies the camera onto the screen,
 * handled by the arcade scene) puts you *in* the cabinet. Keyboard routes to the
 * game only while active; ESC calls `onExit`. Best score is lifted to the parent
 * for persistence.
 */

const BRICK_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8'];
const POWER_COLORS: Record<string, string> = {
  multiball: '#38bdf8',
  widen: '#4ade80',
  shrink: '#f87171',
  laser: '#fbbf24',
};

function draw(ctx: CanvasRenderingContext2D, s: BreakoutState): void {
  const { width, height } = BREAKOUT;
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, width, height);

  for (const b of s.bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = BRICK_COLORS[b.color] ?? '#94a3b8';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(s.paddleX - s.paddleW / 2, BREAKOUT.paddleY, s.paddleW, BREAKOUT.paddleH);

  ctx.fillStyle = '#fef08a';
  for (const ball of s.balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BREAKOUT.ballRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of s.powerUps) {
    ctx.fillStyle = POWER_COLORS[p.kind] ?? '#a855f7';
    ctx.fillRect(p.x - BREAKOUT.powerSize / 2, p.y - BREAKOUT.powerSize / 2, BREAKOUT.powerSize, BREAKOUT.powerSize);
  }

  ctx.fillStyle = '#fca5a5';
  for (const l of s.lasers) ctx.fillRect(l.x - 1, l.y - 6, 2, 6);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${s.score}`, 6, 16);
  ctx.textAlign = 'right';
  ctx.fillText(`♥ ${s.lives}  BEST ${s.best}`, width - 6, 16);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px monospace';
  if (s.status === 'ready') {
    ctx.fillText('BREAKOUT', width / 2, height / 2 - 12);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('SPACE / ENTER to launch', width / 2, height / 2 + 8);
    ctx.fillText('← → or A/D to move · ESC to exit', width / 2, height / 2 + 24);
  } else if (s.status === 'won') {
    ctx.fillText('YOU WIN!', width / 2, height / 2);
    ctx.font = '11px monospace';
    ctx.fillText('R to play again', width / 2, height / 2 + 18);
  } else if (s.status === 'lost') {
    ctx.fillText('GAME OVER', width / 2, height / 2);
    ctx.font = '11px monospace';
    ctx.fillText('R to play again', width / 2, height / 2 + 18);
  }
}

export function BreakoutCabinet({
  position,
  rotationY,
  active,
  best,
  onBest,
  onExit,
}: {
  position: [number, number, number];
  rotationY: number;
  active: boolean;
  best: number;
  onBest: (score: number) => void;
  onExit: () => void;
}) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = BREAKOUT.width;
    c.height = BREAKOUT.height;
    return c;
  }, []);
  const texture = useMemo(() => new CanvasTexture(canvas), [canvas]);
  const game = useRef<BreakoutState>(createBreakout(1, best));
  const input = useRef<BreakoutInput>({ left: false, right: false, fire: false, launch: false });
  const bestRef = useRef(best);
  bestRef.current = best;

  useEffect(() => () => texture.dispose(), [texture]);

  // Fresh game each time the player steps up to the cabinet.
  useEffect(() => {
    if (active) {
      game.current = createBreakout((Date.now() & 0x7fffffff) || 1, bestRef.current);
      input.current = { left: false, right: false, fire: false, launch: false };
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const set = (e: KeyboardEvent, pressed: boolean) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          input.current.left = pressed;
          break;
        case 'ArrowRight':
        case 'KeyD':
          input.current.right = pressed;
          break;
        case 'Space':
          input.current.fire = pressed;
          if (pressed) input.current.launch = true;
          e.preventDefault();
          break;
        case 'Enter':
          if (pressed) input.current.launch = true;
          break;
        case 'KeyR':
          if (pressed) game.current = createBreakout((Date.now() & 0x7fffffff) || 1, bestRef.current);
          break;
        case 'Escape':
          if (pressed) onExit();
          break;
      }
    };
    const onDown = (e: KeyboardEvent) => set(e, true);
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [active, onExit]);

  const drawnBest = useRef(best);

  useFrame((_, dt) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (active) {
      const before = game.current.best;
      stepBreakout(game.current, dt, input.current);
      input.current.launch = false; // edge-triggered
      if (game.current.best !== before && game.current.best !== drawnBest.current) {
        drawnBest.current = game.current.best;
        onBest(game.current.best);
      }
    }
    draw(ctx, game.current);
    texture.needsUpdate = true;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* cabinet body */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.9, 1.8, 0.7]} />
        <meshStandardMaterial color={active ? 0x1f2937 : 0x111827} flatShading />
      </mesh>
      {/* glowing marquee */}
      <mesh position={[0, 1.72, 0.36]}>
        <boxGeometry args={[0.86, 0.22, 0.06]} />
        <meshStandardMaterial color={0x22d3ee} emissive={0x22d3ee} emissiveIntensity={active ? 1.1 : 0.6} />
      </mesh>
      {/* screen (canvas texture) */}
      <mesh position={[0, 1.15, 0.37]}>
        <planeGeometry args={[0.62, 0.82]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
