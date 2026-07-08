import Phaser from 'phaser';
import type { PresenceScene } from '@midnite/shared';
import { interpStep } from '@/lib/presence-interp';
import { presencePeerList, usePresenceStore } from '@/lib/presence-store';
import type { PeerView } from '@/lib/presence-frames';
import { charForVariant, facingToDir } from '@/lib/presence-visual';
import { charKey } from '@/lib/office/textures';

/**
 * Phase 64 Theme C — renders remote teammates in a Phaser office scene, driven by
 * the engine-agnostic presence store. A reusable layer both the main office and
 * the corner office instantiate (scoped by `sceneId`): it diffs the store's peers
 * against its live sprites each frame (create/update/destroy), eases each toward
 * its latest reported position via the shared `interpStep`, and keeps a name plate
 * above every human. With no peers connected it does nothing — the office is
 * exactly its solo self.
 */

const SPRITE_DEPTH = 5;
const SHADOW_DEPTH = 4;
const LABEL_DEPTH = 12;
/** Minimum per-frame move (px²) to read as "walking" and animate the step frame. */
const WALK_EPS_SQ = 0.04;
/** Emote bubble lifetime (ms) — matches the 3D + self-emote TTL (Theme E). */
const EMOTE_TTL = 3200;

interface PeerActor {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  /** Ephemeral emote bubble above the head (Theme E). */
  bubble: Phaser.GameObjects.Text;
  /** Rendered (interpolated) position — eases toward the peer's reported x/y. */
  rx: number;
  ry: number;
  /** Distance walked, driving the 2-frame step cycle without the anim system. */
  step: number;
}

export class PeerLayer {
  private readonly actors = new Map<string, PeerActor>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sceneId: PresenceScene,
  ) {}

  /** Diff + interpolate the peers in this scene. `dtMs` is the frame delta. */
  update(dtMs: number): void {
    const peers = presencePeerList(usePresenceStore.getState().peers).filter((p) => p.scene === this.sceneId);
    const seen = new Set<string>();

    for (const peer of peers) {
      seen.add(peer.peerId);
      let actor = this.actors.get(peer.peerId);
      if (!actor) {
        actor = this.createActor(peer);
        this.actors.set(peer.peerId, actor);
      }
      this.updateActor(actor, peer, dtMs);
    }

    for (const [id, actor] of this.actors) {
      if (seen.has(id)) continue;
      this.destroyActor(actor);
      this.actors.delete(id);
    }
  }

  /** Rendered peer positions (+ tint) for the minimap dot layer. */
  renderedPeers(): { x: number; y: number; tint: number | null }[] {
    const byId = usePresenceStore.getState().peers;
    const out: { x: number; y: number; tint: number | null }[] = [];
    for (const [id, a] of this.actors) out.push({ x: a.rx, y: a.ry, tint: byId[id]?.tint ?? null });
    return out;
  }

  destroy(): void {
    for (const actor of this.actors.values()) this.destroyActor(actor);
    this.actors.clear();
  }

  private createActor(peer: PeerView): PeerActor {
    const { kind, v } = charForVariant(peer.variant);
    const sprite = this.scene.add
      .sprite(peer.x, peer.y, charKey(kind, 'down', 0, v))
      .setDepth(SPRITE_DEPTH);
    if (peer.tint != null) sprite.setTint(peer.tint);
    const shadow = this.scene.add.ellipse(peer.x, peer.y + 13, 16, 6, 0x000000, 0.22).setDepth(SHADOW_DEPTH);
    const label = this.scene.add
      .text(peer.x, peer.y - 19, peer.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e5e7eb',
        backgroundColor: '#0b0b12bb',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(LABEL_DEPTH);
    const bubble = this.scene.add
      .text(peer.x, peer.y - 34, '', { fontSize: '16px' })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(LABEL_DEPTH + 1);
    return { sprite, shadow, label, bubble, rx: peer.x, ry: peer.y, step: 0 };
  }

  private updateActor(actor: PeerActor, peer: PeerView, dtMs: number): void {
    const prevX = actor.rx;
    const prevY = actor.ry;
    const eased = interpStep({ x: actor.rx, y: actor.ry }, { x: peer.x, y: peer.y }, dtMs);
    actor.rx = eased.x;
    actor.ry = eased.y;

    const dx = actor.rx - prevX;
    const dy = actor.ry - prevY;
    const moving = dx * dx + dy * dy > WALK_EPS_SQ;
    actor.step += moving ? Math.hypot(dx, dy) : 0;

    const { kind, v } = charForVariant(peer.variant);
    const { dir, flip } = facingToDir(peer.facing);
    // Two-frame step cycle from distance walked — a walk feel without the Phaser
    // anim system (keeps the layer usable in scenes that don't register anims).
    const frame: 0 | 1 | 2 = moving ? (Math.floor(actor.step / 6) % 2 === 0 ? 1 : 2) : 0;
    actor.sprite.setTexture(charKey(kind, dir, frame, v)).setFlipX(flip);
    actor.sprite.setPosition(actor.rx, actor.ry);
    if (peer.tint != null) actor.sprite.setTint(peer.tint);
    else actor.sprite.clearTint();

    actor.shadow.setPosition(actor.rx, actor.ry + 13);
    if (actor.label.text !== peer.name) actor.label.setText(peer.name);
    actor.label.setPosition(actor.rx, actor.ry - 19);

    // Ephemeral emote bubble above the head, within its TTL.
    const emote = peer.emote && Date.now() - peer.emote.at < EMOTE_TTL ? peer.emote.emoji : '';
    if (actor.bubble.text !== emote) actor.bubble.setText(emote);
    actor.bubble.setPosition(actor.rx, actor.ry - 34);
  }

  private destroyActor(actor: PeerActor): void {
    actor.sprite.destroy();
    actor.shadow.destroy();
    actor.label.destroy();
    actor.bubble.destroy();
  }
}
