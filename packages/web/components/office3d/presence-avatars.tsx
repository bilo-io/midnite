'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import type { PresenceScene } from '@midnite/shared';
import type { PeerView } from '@/lib/presence-frames';
import { interpStep } from '@/lib/presence-interp';
import { presencePeerList, usePresenceStore } from '@/lib/presence-store';
import { facingYaw, presencePxToUnit } from '@/lib/presence-3d';
import { CHAT_RADIUS_PX, isChatLive } from '@/lib/presence-chat';
import { OFFICE_TILE } from '@/lib/office/dimensions';

/**
 * Phase 64 Themes D + G — remote teammates in the 3D office. Renders the same
 * presence store slice the 2D office does (Theme C), scoped to the active 3D
 * scene: each peer is a Phase-63-style low-poly figure (tinted) with a drei
 * `<Html>` name plate, an ephemeral emote bubble, and a proximity-chat speech
 * bubble (Theme G — shown only when the camera is within the chat radius), all
 * eased toward the reported position via the shared `interpStep`. Peer positions
 * arrive as 2D world pixels and convert to 3D units (`presencePxToUnit`). Meshes
 * are `frustumCulled` (three's default), so a peer in an unseen room costs no draw
 * calls while the minimap still shows them.
 */

const PLATE_RANGE = 14;
const PLATE_FADE_START = 9;
/** Emote bubble lifetime (ms) — matches the 2D bubble feel. */
const EMOTE_TTL = 3200;
/** Snap threshold in world units (~3 tiles) — a scene change / big jump. */
const SNAP_UNITS = 3;
/** Chat proximity radius in world units (the wire-px radius / tile size). */
const CHAT_RADIUS_UNITS = CHAT_RADIUS_PX / OFFICE_TILE;

const DEFAULT_TINT = 0x9aa7ff;

function PresencePeer3D({ peer }: { peer: PeerView }) {
  const group = useRef<Group>(null);
  const plate = useRef<HTMLDivElement>(null);
  const emoteEl = useRef<HTMLDivElement>(null);
  const chatEl = useRef<HTMLDivElement>(null);
  const { camera } = useThree();

  // Rendered position (world units), eased toward the reported target.
  const start = presencePxToUnit(peer.x, peer.y);
  const rx = useRef(start.x);
  const rz = useRef(start.z);
  const tint = peer.tint ?? DEFAULT_TINT;

  useFrame((_, dt) => {
    const target = presencePxToUnit(peer.x, peer.y);
    const eased = interpStep({ x: rx.current, y: rz.current }, { x: target.x, y: target.z }, dt * 1000, {
      rateMs: 120,
      snapDist: SNAP_UNITS,
    });
    rx.current = eased.x;
    rz.current = eased.y;
    const g = group.current;
    if (g) {
      g.position.x = rx.current;
      g.position.z = rz.current;
      g.rotation.y = facingYaw(peer.facing);
    }

    // Distance-fade the name plate (mutate the portalled node; no re-render).
    const dist = Math.hypot(camera.position.x - rx.current, camera.position.z - rz.current);
    const el = plate.current;
    if (el) {
      const opacity = dist <= PLATE_FADE_START ? 1 : dist >= PLATE_RANGE ? 0 : 1 - (dist - PLATE_FADE_START) / (PLATE_RANGE - PLATE_FADE_START);
      el.style.opacity = String(opacity);
      el.style.visibility = opacity < 0.02 ? 'hidden' : 'visible';
    }
    // Show the emote bubble only within its TTL.
    const eb = emoteEl.current;
    if (eb) eb.style.opacity = peer.emote && Date.now() - peer.emote.at < EMOTE_TTL ? '1' : '0';
    // Show the chat bubble within its TTL *and* only when the camera is near
    // enough (client-side proximity filter, matching the 2D radius rule).
    const cb = chatEl.current;
    if (cb) {
      const show = !!peer.chat && isChatLive(peer.chat.at, peer.chat.text, Date.now()) && dist <= CHAT_RADIUS_UNITS;
      cb.style.opacity = show ? '1' : '0';
      cb.style.visibility = show ? 'visible' : 'hidden';
    }
  });

  return (
    <group ref={group} position={[start.x, 0, start.z]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.5, 0.9, 0.42]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>

      <Html position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[20, 0]} pointerEvents="none">
        <div
          ref={plate}
          className="pointer-events-none select-none whitespace-nowrap rounded-md border border-border/60 bg-background/85 px-2 py-0.5 text-center text-[11px] font-semibold leading-tight text-foreground shadow-md backdrop-blur"
          style={{ transition: 'opacity 120ms linear' }}
        >
          {peer.name}
        </div>
      </Html>

      <Html position={[0, 2.15, 0]} center distanceFactor={9} zIndexRange={[21, 0]} pointerEvents="none">
        <div ref={emoteEl} className="pointer-events-none select-none text-2xl" style={{ opacity: 0, transition: 'opacity 150ms linear' }}>
          {peer.emote?.emoji ?? ''}
        </div>
      </Html>

      <Html position={[0, 2.5, 0]} center distanceFactor={9} zIndexRange={[22, 0]} pointerEvents="none">
        <div
          ref={chatEl}
          className="pointer-events-none max-w-[150px] select-none rounded-lg bg-[#e5e7eb] px-2 py-1 text-center text-[11px] font-medium leading-snug text-[#0b0b12] shadow-md"
          style={{ opacity: 0, visibility: 'hidden', transition: 'opacity 150ms linear' }}
        >
          {peer.chat?.text ?? ''}
        </div>
      </Html>
    </group>
  );
}

export function PresenceAvatars({ scene }: { scene: PresenceScene }) {
  const peers = usePresenceStore((s) => s.peers);
  return (
    <group>
      {presencePeerList(peers)
        .filter((p) => p.scene === scene)
        .map((p) => (
          <PresencePeer3D key={p.peerId} peer={p} />
        ))}
    </group>
  );
}
