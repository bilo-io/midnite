'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import { STATUS_CSS, STATUS_LABEL } from '@/lib/office/agents';
import type { AvatarPlacement } from '@/lib/office3d/agents-3d';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';

/**
 * Phase 63 Theme C — live agent avatars + billboards. Each store agent renders as
 * a low-poly procedural figure (tinted per its stable identity colour) at the same
 * seat its 2D robot would occupy (see [`agents-3d.ts`](../../lib/office3d/agents-3d.ts)),
 * with a drei `<Html>` plate above it showing name + status + the Phase-31
 * live-activity tool label. Plates are distance-faded (opacity ramps to 0 past
 * `PLATE_RANGE`) so far rooms don't clutter, and running avatars get a subtle idle
 * bob — disabled under reduced motion via `useAnimationPrefs`.
 */

/** World-unit distance past which a nameplate fades out fully. */
const PLATE_RANGE = 9;
/** Distance at which the plate starts fading (full opacity nearer than this). */
const PLATE_FADE_START = 6;
/** Idle bob amplitude (world units) for a running avatar. */
const BOB_AMP = 0.03;
const BOB_SPEED = 3.2;

function AgentAvatar({ placement, index }: { placement: AvatarPlacement; index: number }) {
  const { agent, x, z, tint, kind } = placement;
  const group = useRef<Group>(null);
  const plate = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const { animate } = useAnimationPrefs();

  const running = agent.liveActivity?.phase === 'running';
  const baseY = kind === 'lounge' ? 0.15 : 0; // loungers sit lower on the deck

  useFrame((state) => {
    const g = group.current;
    if (g) {
      // Subtle idle bob for actively-working avatars; flat under reduced motion.
      const bob = animate && running ? Math.sin(state.clock.elapsedTime * BOB_SPEED + index) * BOB_AMP : 0;
      g.position.y = baseY + bob;
    }
    // Distance-fade the plate (no re-render — mutate the portalled div directly).
    const el = plate.current;
    if (el) {
      const dx = camera.position.x - x;
      const dz = camera.position.z - z;
      const dist = Math.hypot(dx, dz);
      const opacity =
        dist <= PLATE_FADE_START ? 1 : dist >= PLATE_RANGE ? 0 : 1 - (dist - PLATE_FADE_START) / (PLATE_RANGE - PLATE_FADE_START);
      el.style.opacity = String(opacity);
      el.style.visibility = opacity < 0.02 ? 'hidden' : 'visible';
    }
  });

  const toolLabel = running ? agent.liveActivity?.label : undefined;

  return (
    <group position={[x, baseY, z]} ref={group}>
      {/* torso */}
      <mesh position={[0, 0.55, 0]} castShadow={false}>
        <boxGeometry args={[0.5, 0.9, 0.42]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
      {/* status cap — a small emissive block whose colour tracks the agent status */}
      <mesh position={[0, 1.44, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.16]} />
        <meshStandardMaterial color={STATUS_CSS[agent.status]} emissive={STATUS_CSS[agent.status]} emissiveIntensity={0.5} />
      </mesh>

      <Html position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[20, 0]} pointerEvents="none">
        <div
          ref={plate}
          className="pointer-events-none select-none whitespace-nowrap rounded-md border border-border/60 bg-background/85 px-2 py-1 text-center shadow-md backdrop-blur"
          style={{ transition: 'opacity 120ms linear' }}
        >
          <div className="text-[11px] font-semibold leading-tight text-foreground">{agent.name}</div>
          <div className="text-[10px] leading-tight" style={{ color: STATUS_CSS[agent.status] }}>
            {STATUS_LABEL[agent.status]}
          </div>
          {toolLabel && (
            <div className="mt-0.5 max-w-[160px] truncate font-mono text-[10px] leading-tight text-muted-foreground">
              {toolLabel}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export function AgentAvatars({ placements }: { placements: AvatarPlacement[] }) {
  return (
    <group>
      {placements.map((p, i) => (
        <AgentAvatar key={p.agent.id} placement={p} index={i} />
      ))}
    </group>
  );
}
