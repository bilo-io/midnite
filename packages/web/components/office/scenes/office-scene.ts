import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { STATUS_LABEL, STATUS_TINT, type OfficeAgent, type OfficeStatus } from '@/lib/office/agents';
import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from '@/lib/office/dimensions';
import { buildOfficePalette, type OfficePalette } from '@/lib/office/theme';
import {
  agentTint,
  charKey,
  ensureOfficeAnims,
  ensureOfficeTextures,
  TEX,
  walkAnim,
  type Dir,
} from '@/lib/office/textures';

// Phase 8 renders the office with procedurally-generated pixel-art sprites/tiles
// (see lib/office/textures.ts) instead of Milestone-1's flat shapes: a tiled floor,
// brick walls, wooden desks, and little character sprites that walk (player) or sit
// (agents). Tiles are drawn neutral and tinted to the live theme palette so the
// canvas still follows light/dark (lib/office/theme.ts). The movement, proximity,
// theme-bridge, and store/HUD logic below are unchanged from Milestone 1.

const TILE = OFFICE_TILE;
const COLS = OFFICE_COLS;
const ROWS = OFFICE_ROWS;
const PLAYER_SPEED = 150;
/** How close (px) the player must be to a desk to "reach" it. */
const PROXIMITY = TILE * 1.5;
/** Native character sprite (12×15) scaled up for the 32px grid. */
const CHAR_SCALE = 1.7;

// '#' wall, '.' floor.
const LAYOUT = [
  '######################',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '#....................#',
  '######################',
];

// Physical desks, in fill order. Two rows of four; the player spawns below them.
const DESK_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 4, y: 3 },
  { x: 8, y: 3 },
  { x: 12, y: 3 },
  { x: 16, y: 3 },
  { x: 4, y: 7 },
  { x: 8, y: 7 },
  { x: 12, y: 7 },
  { x: 16, y: 7 },
];

/** Status → speech-bubble glyph shown above a seated agent. */
const STATUS_BUBBLE: Record<OfficeStatus, string> = {
  running: '···',
  waiting: '?',
  completed: '✓',
  idle: 'z',
};

const center = (tile: number) => tile * TILE + TILE / 2;
const toHex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

type Slot = {
  cx: number;
  cy: number;
  occupant: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  bubble: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  agentId: string | null;
};

class OfficeScene extends Phaser.Scene {
  private palette!: OfficePalette;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private highlight!: Phaser.GameObjects.Arc;
  private floor!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly slots: Slot[] = [];
  private readonly walls: Phaser.GameObjects.Image[] = [];
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  private lastNearby: string | null = null;
  private facing: Dir = 'down';
  /** False while the React interaction panel is open — freezes input/movement. */
  private inputEnabled = true;
  /** True between create() and teardown; guards late store/theme callbacks. */
  private alive = false;
  private unsub?: () => void;

  constructor() {
    super('office');
  }

  create() {
    this.palette = buildOfficePalette();
    ensureOfficeTextures(this);
    ensureOfficeAnims(this);

    const worldW = COLS * TILE;
    const worldH = ROWS * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(this.palette.background);

    this.floor = this.add
      .tileSprite(0, 0, worldW, worldH, TEX.floor)
      .setOrigin(0, 0)
      .setTint(this.palette.floor)
      .setDepth(-10);

    this.buildWalls();
    this.buildDesks();
    this.buildPlayer();

    // One collider against everything solid (walls + desks).
    this.physics.add.collider(this.player, this.solids);

    // Shared marker that hops to whichever occupied desk is in reach.
    this.highlight = this.add
      .circle(0, 0, TILE * 0.85, this.palette.highlight, 0)
      .setStrokeStyle(2, this.palette.highlight, 0.9)
      .setVisible(false)
      .setDepth(9);

    this.buildVignette(worldW, worldH);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as OfficeScene['wasd'];

    this.input.keyboard!.on('keydown-E', this.tryInteract, this);
    this.input.keyboard!.on('keydown-ENTER', this.tryInteract, this);

    // Live now — the guarded callbacks below check this so a late store/theme
    // update can't touch destroyed objects after teardown.
    this.alive = true;

    // React to the store: re-render occupants when the agent list changes, and
    // freeze input + hand the keyboard to React while the panel is open.
    this.unsub = useOfficeStore.subscribe((state, prev) => {
      if (!this.alive) return;
      if (state.agents !== prev.agents) this.renderOccupants(state.agents);
      if (state.active !== prev.active) {
        const open = state.active !== null;
        this.inputEnabled = !open;
        const kb = this.input.keyboard;
        if (kb) kb.enabled = !open;
        if (open) this.body().setVelocity(0, 0);
      }
    });
    // Paint whatever's already loaded (data may arrive before or after create).
    this.renderOccupants(useOfficeStore.getState().agents);

    // Tear down on shutdown AND destroy (whichever fires first) so a late store
    // update can't reach destroyed text/objects after a StrictMode/HMR remount.
    const teardown = () => {
      this.alive = false;
      this.unsub?.();
      this.unsub = undefined;
      useOfficeStore.getState().reset();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  override update() {
    if (!this.alive) return;
    if (!this.inputEnabled) {
      this.body().setVelocity(0, 0);
      this.idle();
      return;
    }

    const vx = (this.right() ? 1 : 0) - (this.left() ? 1 : 0);
    const vy = (this.down() ? 1 : 0) - (this.up() ? 1 : 0);
    if (vx || vy) {
      const inv = PLAYER_SPEED / Math.hypot(vx, vy);
      this.body().setVelocity(vx * inv, vy * inv);
      this.animateWalk(vx, vy);
    } else {
      this.body().setVelocity(0, 0);
      this.idle();
    }
    this.playerShadow.setPosition(this.player.x, this.player.y + TILE * 0.42);

    // Nearest *occupied* desk within reach drives the highlight + the store.
    const px = this.player.x;
    const py = this.player.y;
    let nearest: Slot | null = null;
    let best = PROXIMITY * PROXIMITY;
    for (const s of this.slots) {
      if (!s.agentId) continue;
      const dist = (px - s.cx) ** 2 + (py - s.cy) ** 2;
      if (dist <= best) {
        best = dist;
        nearest = s;
      }
    }

    if (nearest) this.highlight.setPosition(nearest.cx, nearest.cy).setVisible(true);
    else this.highlight.setVisible(false);

    const id = nearest?.agentId ?? null;
    if (id !== this.lastNearby) {
      this.lastNearby = id;
      useOfficeStore.getState().setNearby(id);
    }
  }

  /** Re-tint the theme-driven objects when the app's light/dark theme flips. */
  applyPalette(palette: OfficePalette) {
    if (!this.alive) return;
    this.palette = palette;
    this.cameras.main.setBackgroundColor(palette.background);
    this.floor.setTint(palette.floor);
    for (const wall of this.walls) wall.setTint(palette.wall);
    for (const slot of this.slots) slot.nameText.setColor(toHex(palette.text));
    this.highlight.setStrokeStyle(2, palette.highlight, 0.9);
  }

  /** Assign agents to desks in order; show/hide each desk's occupant visuals. */
  private renderOccupants(agents: OfficeAgent[]) {
    if (!this.alive) return;
    this.slots.forEach((slot, i) => {
      const agent = agents[i];
      if (agent) {
        slot.agentId = agent.id;
        slot.occupant.setTexture(charKey('down', 0)).setTint(agentTint(agent.id)).setVisible(true);
        slot.shadow.setVisible(true);
        slot.nameText.setText(this.truncate(agent.name)).setVisible(true);
        const tint = STATUS_TINT[agent.status];
        slot.statusText.setText(STATUS_LABEL[agent.status]).setColor(toHex(tint)).setVisible(true);
        slot.bubble.setText(STATUS_BUBBLE[agent.status]).setColor(toHex(tint)).setVisible(true);
      } else {
        slot.agentId = null;
        slot.occupant.setVisible(false);
        slot.shadow.setVisible(false);
        slot.nameText.setVisible(false);
        slot.statusText.setVisible(false);
        slot.bubble.setVisible(false);
      }
    });

    // If the open agent vanished (session ended), close its panel.
    const active = useOfficeStore.getState().active;
    if (active && !agents.some((a) => a.id === active.id)) useOfficeStore.getState().close();
  }

  /** Drive the player's walk animation + facing from the movement vector. */
  private animateWalk(vx: number, vy: number) {
    if (Math.abs(vx) > Math.abs(vy)) {
      this.facing = 'side';
      this.player.setFlipX(vx < 0);
    } else {
      this.facing = vy < 0 ? 'up' : 'down';
      this.player.setFlipX(false);
    }
    this.player.anims.play(walkAnim(this.facing), true);
  }

  /** Settle the player onto a static idle frame in the current facing. */
  private idle() {
    this.player.anims.stop();
    this.player.setTexture(charKey(this.facing, 0));
  }

  private tryInteract() {
    if (this.inputEnabled && this.lastNearby) useOfficeStore.getState().open(this.lastNearby);
  }

  private body() {
    return this.player.body as Phaser.Physics.Arcade.Body;
  }

  private truncate(name: string) {
    return name.length > 10 ? `${name.slice(0, 9)}…` : name;
  }

  private left = () => this.cursors.left.isDown || this.wasd.left.isDown;
  private right = () => this.cursors.right.isDown || this.wasd.right.isDown;
  private up = () => this.cursors.up.isDown || this.wasd.up.isDown;
  private down = () => this.cursors.down.isDown || this.wasd.down.isDown;

  private buildWalls() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (LAYOUT[y]![x] !== '#') continue;
        const wall = this.physics.add.staticImage(center(x), center(y), TEX.wall).setTint(this.palette.wall);
        this.walls.push(wall);
        this.solids.push(wall);
      }
    }
  }

  /** Build the fixed desk furniture + per-slot occupant visuals (hidden until filled). */
  private buildDesks() {
    for (const { x, y } of DESK_SLOTS) {
      const cx = center(x);
      const cy = center(y);

      const shadow = this.add.ellipse(cx, cy + TILE * 0.42, TILE * 0.5, TILE * 0.2, 0x000000, 0.22).setDepth(1);
      this.add.image(cx, cy + TILE * 0.25, TEX.chair).setDepth(2);
      const occupant = this.add
        .sprite(cx, cy - TILE * 0.03, charKey('down', 0))
        .setScale(CHAR_SCALE)
        .setDepth(4)
        .setVisible(false);
      // Desk sits in front of the seated agent so their lower half is hidden.
      const desk = this.physics.add.staticImage(cx, cy + TILE * 0.28, TEX.desk).setDepth(6);
      this.solids.push(desk);
      this.add.image(cx, cy + TILE * 0.16, TEX.monitor).setDepth(7);

      const bubble = this.add
        .text(cx + TILE * 0.34, cy - TILE * 0.5, '', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#e5e7eb',
          backgroundColor: '#0b0b12cc',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(11)
        .setVisible(false);
      this.tweens.add({ targets: bubble, y: bubble.y - 3, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      const nameText = this.add
        .text(cx, cy - TILE * 0.92, '', { fontFamily: 'monospace', fontSize: '11px', color: toHex(this.palette.text) })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(11)
        .setVisible(false);
      const statusText = this.add
        .text(cx, cy - TILE * 0.66, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e5e7eb' })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(11)
        .setVisible(false);

      this.slots.push({ cx, cy, occupant, shadow, bubble, nameText, statusText, agentId: null });
    }
  }

  private buildPlayer() {
    const spawn = { x: center(10), y: center(11) };
    this.playerShadow = this.add
      .ellipse(spawn.x, spawn.y + TILE * 0.42, TILE * 0.45, TILE * 0.18, 0x000000, 0.25)
      .setDepth(7);
    this.player = this.add
      .sprite(spawn.x, spawn.y, charKey('down', 0))
      .setScale(CHAR_SCALE)
      .setTint(this.palette.player)
      .setDepth(8);
    this.physics.add.existing(this.player);
    this.body().setSize(8, 6).setOffset(2, 9);
    this.body().setCollideWorldBounds(true);
  }

  /** A soft radial darkening at the room edges. Generated once as a canvas texture. */
  private buildVignette(worldW: number, worldH: number) {
    const key = 'office-vignette';
    if (!this.textures.exists(key)) {
      const canvas = this.textures.createCanvas(key, worldW, worldH);
      const ctx = canvas?.getContext();
      if (ctx) {
        const grd = ctx.createRadialGradient(
          worldW / 2,
          worldH / 2,
          Math.min(worldW, worldH) * 0.25,
          worldW / 2,
          worldH / 2,
          Math.max(worldW, worldH) * 0.62,
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.32)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, worldW, worldH);
        canvas?.refresh();
      }
    }
    this.add.image(worldW / 2, worldH / 2, key).setDepth(40);
  }
}

/** Build a Phaser game mounted into `parent`. Caller owns destroy(). */
export function createOfficeGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: COLS * TILE,
    height: ROWS * TILE,
    backgroundColor: '#0b0b12',
    pixelArt: true, // nearest-neighbour scaling — keeps tiles/sprites crisp
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: OfficeScene,
  });
}

/** Re-read the app theme tokens and re-tint the running office scene. */
export function applyOfficeTheme(game: Phaser.Game): void {
  const scene = game.scene.getScene('office') as OfficeScene | null;
  scene?.applyPalette(buildOfficePalette());
}
