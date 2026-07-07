'use client';

import { Hud, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';

import { STATUS_TINT } from '@/lib/office/agents';
import { minimapLayout, minimapRooms } from '@/lib/office/minimap';
import { ROOM_STYLES } from '@/lib/office/theme';
import { useOfficeStore } from '@/lib/office-store';
import { presencePeerList, usePresenceStore } from '@/lib/presence-store';
import type { AvatarPlacement } from '@/lib/office3d/agents-3d';
import { minimapFacing, worldUnitToMinimap } from '@/lib/office3d/minimap-3d';
import { presencePxToUnit } from '@/lib/presence-3d';
import type { PlayerPose } from './first-person-rig';

/**
 * Phase 63 Theme C — the in-canvas minimap HUD. A drei `<Hud>` overlay (its own
 * orthographic camera in pixel space, pinned bottom-right) redraws the 2D office's
 * minimap in three primitives: room outlines from
 * [`minimap.ts`](../../lib/office/minimap.ts), agent dots coloured by status
 * (attention → red), and a player arrow tracking live position + facing from
 * `poseRef`. Reuses the tested 2D minimap geometry so the overview matches the 2D
 * office exactly.
 */

const MAX_W = 150;
const MAX_H = 100;
const PAD = 6;
const MARGIN = 12;
const ATTENTION = 0xf87171;
/** Remote-teammate dot colour (cyan) — matches the 2D minimap (Phase 64 C/D). */
const PEER = 0x22d3ee;

export function MinimapHud({
  placements,
  poseRef,
}: {
  placements: AvatarPlacement[];
  poseRef: React.RefObject<PlayerPose>;
}) {
  const size = useThree((s) => s.size);
  const player = useRef<Group>(null);
  // The player's chosen character tint (Phase-39) colours their minimap arrow —
  // the small bit of avatar identity that shows in first-person.
  const playerTint = useOfficeStore((s) => s.playerTint);

  const { scale, panelW, panelH } = useMemo(() => {
    const l = minimapLayout(MAX_W, MAX_H);
    return { scale: l.scale, panelW: l.width + PAD * 2, panelH: l.height + PAD * 2 };
  }, []);

  // Panel bottom-left corner in the ortho pixel space (origin at screen centre,
  // +y up). Minimap content is authored top-left/+y-down, so a content point
  // (mx,my) maps to local (mx, panelH - my).
  const originX = size.width / 2 - MARGIN - panelW;
  const originY = -size.height / 2 + MARGIN;

  const rooms = useMemo(() => minimapRooms(scale, PAD), [scale]);

  const dots = useMemo(
    () =>
      placements.map((p) => {
        const pt = worldUnitToMinimap(p.x, p.z, scale, PAD);
        const color = p.agent.attention ? ATTENTION : STATUS_TINT[p.agent.status];
        return { id: p.agent.id, x: pt.x, y: panelH - pt.y, color };
      }),
    [placements, scale, panelH],
  );

  // Remote teammates in the office scene — live dots (peers move ~10Hz).
  const peers = usePresenceStore((s) => s.peers);
  const peerDots = useMemo(
    () =>
      presencePeerList(peers)
        .filter((p) => p.scene === 'office')
        .map((p) => {
          const u = presencePxToUnit(p.x, p.y);
          const pt = worldUnitToMinimap(u.x, u.z, scale, PAD);
          return { id: p.peerId, x: pt.x, y: panelH - pt.y };
        }),
    [peers, scale, panelH],
  );

  useFrame(() => {
    const g = player.current;
    const pose = poseRef.current;
    if (!g || !pose) return;
    const pt = worldUnitToMinimap(pose.x, pose.z, scale, PAD);
    g.position.set(pt.x, panelH - pt.y, 4);
    // circleGeometry(_, 3) tips toward +x; +90° makes it a +Y triangle so
    // minimapFacing's +Y-forward convention aligns.
    g.rotation.z = minimapFacing(pose.dirX, pose.dirZ) + Math.PI / 2;
  });

  return (
    <Hud renderPriority={1}>
      <OrthographicCamera
        makeDefault
        left={-size.width / 2}
        right={size.width / 2}
        top={size.height / 2}
        bottom={-size.height / 2}
        near={-100}
        far={100}
        position={[0, 0, 10]}
      />
      <group position={[originX, originY, 0]}>
        {/* panel */}
        <mesh position={[panelW / 2, panelH / 2, 0]}>
          <planeGeometry args={[panelW, panelH]} />
          <meshBasicMaterial color={0x0b0b12} transparent opacity={0.72} />
        </mesh>
        {/* room outlines */}
        {rooms.map(({ id, rect }) => (
          <mesh key={id} position={[rect.x + rect.w / 2, panelH - (rect.y + rect.h / 2), 1]}>
            <planeGeometry args={[rect.w, rect.h]} />
            <meshBasicMaterial color={ROOM_STYLES[id].accent} transparent opacity={0.35} />
          </mesh>
        ))}
        {/* agent dots */}
        {dots.map((d) => (
          <mesh key={d.id} position={[d.x, d.y, 2]}>
            <circleGeometry args={[2.2, 12]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
        ))}
        {/* remote teammate dots (Phase 64 D) */}
        {peerDots.map((d) => (
          <mesh key={d.id} position={[d.x, d.y, 2.5]}>
            <circleGeometry args={[2, 12]} />
            <meshBasicMaterial color={PEER} />
          </mesh>
        ))}
        {/* player arrow */}
        <group ref={player}>
          <mesh>
            <circleGeometry args={[3.4, 3]} />
            <meshBasicMaterial color={playerTint ?? 0xffffff} />
          </mesh>
        </group>
      </group>
    </Hud>
  );
}
