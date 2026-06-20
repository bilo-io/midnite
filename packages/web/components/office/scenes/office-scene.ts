import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { STATUS_LABEL, STATUS_TINT, type OfficeAgent } from '@/lib/office/agents';

// Milestone 1 renders a procedural office — a tile grid drawn with shapes, no art
// assets. The office has a fixed set of desks; live agents (from the store) fill
// them in order and update reactively. Milestone 2 swaps the procedural drawing
// for a Tiled (.tmj) map + a pixel-art tileset, keeping the movement, proximity,
// and store-bridge logic below.

const TILE = 32;
const COLS = 22;
const ROWS = 14;
const PLAYER_SPEED = 160;
/** How close (px) the player must be to a desk to "reach" it. */
const PROXIMITY = TILE * 1.5;

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

const COLORS = {
  floor: 0x14141c,
  grid: 0x232334,
  wall: 0x2c2c3e,
  wallStroke: 0x1c1c2a,
  desk: 0x6b4f3a,
  deskStroke: 0x3f2f22,
  monitor: 0x0f172a,
  monitorStroke: 0x334155,
  chair: 0x334155,
  player: 0x38bdf8,
  playerStroke: 0xffffff,
  highlight: 0xfacc15,
} as const;

const center = (tile: number) => tile * TILE + TILE / 2;
const toHex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

type Slot = {
  cx: number;
  cy: number;
  occupant: Phaser.GameObjects.Arc;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  agentId: string | null;
};

class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private highlight!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly slots: Slot[] = [];
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  private lastNearby: string | null = null;
  /** False while the React interaction panel is open — freezes input/movement. */
  private inputEnabled = true;
  /** True between create() and teardown; guards late store callbacks. */
  private alive = false;
  private unsub?: () => void;

  constructor() {
    super('office');
  }

  create() {
    const worldW = COLS * TILE;
    const worldH = ROWS * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.drawFloor(worldW, worldH);
    this.buildWalls();
    this.buildDesks();
    this.buildPlayer();

    // One collider against everything solid (walls + desks).
    this.physics.add.collider(this.player, this.solids);

    // Shared marker that hops to whichever occupied desk is in reach.
    this.highlight = this.add
      .circle(0, 0, TILE * 0.85, COLORS.highlight, 0)
      .setStrokeStyle(2, COLORS.highlight, 0.9)
      .setVisible(false)
      .setDepth(3);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as OfficeScene['wasd'];

    this.input.keyboard!.on('keydown-E', this.tryInteract, this);
    this.input.keyboard!.on('keydown-ENTER', this.tryInteract, this);

    // Live now — the guarded callbacks below check this so a late store update
    // can't touch destroyed objects after teardown.
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
      return;
    }

    const vx = (this.right() ? 1 : 0) - (this.left() ? 1 : 0);
    const vy = (this.down() ? 1 : 0) - (this.up() ? 1 : 0);
    if (vx || vy) {
      const inv = PLAYER_SPEED / Math.hypot(vx, vy);
      this.body().setVelocity(vx * inv, vy * inv);
    } else {
      this.body().setVelocity(0, 0);
    }

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

  /** Assign agents to desks in order; show/hide each desk's occupant visuals. */
  private renderOccupants(agents: OfficeAgent[]) {
    if (!this.alive) return;
    this.slots.forEach((slot, i) => {
      const agent = agents[i];
      if (agent) {
        slot.agentId = agent.id;
        const tint = STATUS_TINT[agent.status];
        slot.occupant.setFillStyle(tint).setVisible(true);
        slot.nameText.setText(this.truncate(agent.name)).setVisible(true);
        slot.statusText.setText(STATUS_LABEL[agent.status]).setColor(toHex(tint)).setVisible(true);
      } else {
        slot.agentId = null;
        slot.occupant.setVisible(false);
        slot.nameText.setVisible(false);
        slot.statusText.setVisible(false);
      }
    });

    // If the open agent vanished (session ended), close its panel.
    const active = useOfficeStore.getState().active;
    if (active && !agents.some((a) => a.id === active.id)) useOfficeStore.getState().close();
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

  private drawFloor(worldW: number, worldH: number) {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(COLORS.floor, 1).fillRect(0, 0, worldW, worldH);
    g.lineStyle(1, COLORS.grid, 0.6);
    for (let x = 0; x <= COLS; x++) g.lineBetween(x * TILE, 0, x * TILE, worldH);
    for (let y = 0; y <= ROWS; y++) g.lineBetween(0, y * TILE, worldW, y * TILE);
  }

  private buildWalls() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (LAYOUT[y]![x] !== '#') continue;
        const wall = this.add
          .rectangle(center(x), center(y), TILE, TILE, COLORS.wall)
          .setStrokeStyle(1, COLORS.wallStroke);
        this.physics.add.existing(wall, true);
        this.solids.push(wall);
      }
    }
  }

  /** Build the fixed desk furniture + per-slot occupant visuals (hidden until filled). */
  private buildDesks() {
    for (const { x, y } of DESK_SLOTS) {
      const cx = center(x);
      const cy = center(y);

      this.add.rectangle(cx, cy + TILE * 0.12, TILE * 0.5, TILE * 0.5, COLORS.chair).setDepth(1);
      const desk = this.add
        .rectangle(cx, cy, TILE * 0.92, TILE * 0.92, COLORS.desk)
        .setStrokeStyle(1, COLORS.deskStroke)
        .setDepth(1);
      this.physics.add.existing(desk, true);
      this.solids.push(desk);
      this.add
        .rectangle(cx, cy - TILE * 0.16, TILE * 0.5, TILE * 0.34, COLORS.monitor)
        .setStrokeStyle(1, COLORS.monitorStroke)
        .setDepth(2);

      const occupant = this.add
        .circle(cx, cy - TILE * 0.55, TILE * 0.26, 0xffffff)
        .setStrokeStyle(2, COLORS.floor, 0.7)
        .setVisible(false)
        .setDepth(2);
      const nameText = this.add
        .text(cx, cy - TILE * 1.15, '', { fontFamily: 'monospace', fontSize: '11px', color: '#e5e7eb' })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(5)
        .setVisible(false);
      const statusText = this.add
        .text(cx, cy - TILE * 0.92, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e5e7eb' })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(5)
        .setVisible(false);

      this.slots.push({ cx, cy, occupant, nameText, statusText, agentId: null });
    }
  }

  private buildPlayer() {
    const spawn = { x: center(10), y: center(11) };
    this.player = this.add
      .circle(spawn.x, spawn.y, TILE * 0.32, COLORS.player)
      .setStrokeStyle(2, COLORS.playerStroke, 0.9)
      .setDepth(4);
    this.physics.add.existing(this.player);
    this.body().setCircle(TILE * 0.32);
    this.body().setCollideWorldBounds(true);
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
