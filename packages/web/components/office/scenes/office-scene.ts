import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { STATUS_LABEL, STATUS_TINT, type OfficeAgent, type OfficeStatus } from '@/lib/office/agents';
import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from '@/lib/office/dimensions';
import {
  ARMCHAIRS,
  BOARD_POS,
  CONSOLE_POS,
  COUCHES,
  DESK_SEATS,
  LAYOUT,
  LOUNGE_SEATS,
  PLANTS,
  PLAYER_SPAWN,
  RUGS,
  TABLE_CHAIRS,
  TABLE_POS,
  TV_POS,
  ZONE_LABELS,
  type TilePos,
} from '@/lib/office/layout';
import { buildOfficePalette, type OfficePalette } from '@/lib/office/theme';
import { agentTint, charKey, ensureOfficeAnims, ensureOfficeTextures, TEX, walkAnim } from '@/lib/office/textures';

// Phase 8 office: a zoned, sprite-based room. Working agents (robots) sit at hot
// desks (interactable); idle agents chill in the lounge (TV + console + couches);
// a walled board room holds a conference table + a documents whiteboard the player
// walks up to. Agents walk between the lounge and their desk when their status
// flips. Tiles are tinted to the theme palette so the canvas still follows
// light/dark. See lib/office/{layout,textures,theme}.ts.

const TILE = OFFICE_TILE;
const COLS = OFFICE_COLS;
const ROWS = OFFICE_ROWS;
const PLAYER_SPEED = 150;
/** How close (px) the player must be to a desk/board to "reach" it. */
const PROXIMITY = TILE * 1.6;
/** Native character sprite (16×20) scaled up for the 32px grid. */
const CHAR_SCALE = 1.3;
/** Lift a seated sprite up a touch so it sits behind its desk / on its couch. */
const SEAT_LIFT = 6;

/** Status → speech-bubble glyph shown above an agent. */
const STATUS_BUBBLE: Record<OfficeStatus, string> = {
  running: '···',
  waiting: '?',
  completed: '✓',
  idle: 'z',
};

const center = (tile: number) => tile * TILE + TILE / 2;
const toHex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** A live agent rendered in the room — a robot sprite + its labels/shadow. */
type Actor = {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  bubble: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  /** Where the agent currently belongs — only desks are interactable. */
  kind: 'desk' | 'lounge';
  /** Target seat centre (px). */
  tx: number;
  ty: number;
  walking: boolean;
  tween?: Phaser.Tweens.Tween;
};

class OfficeScene extends Phaser.Scene {
  private palette!: OfficePalette;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private highlight!: Phaser.GameObjects.Arc;
  private floor!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly actors = new Map<string, Actor>();
  private readonly walls: Phaser.GameObjects.Image[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  private boardCenter = { x: 0, y: 0 };
  private lastNearby: string | null = null;
  private nearBoardFlag = false;
  private facing: 'down' | 'up' | 'side' = 'down';
  /** False while a React panel is open — freezes input/movement. */
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

    this.buildRugs();
    this.buildWalls();
    this.buildDesks();
    this.buildLounge();
    this.buildBoardroom();
    this.buildPlants();
    this.buildLabels();
    this.buildPlayer();

    this.physics.add.collider(this.player, this.solids);

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

    this.alive = true;

    this.unsub = useOfficeStore.subscribe((state, prev) => {
      if (!this.alive) return;
      if (state.agents !== prev.agents) this.renderActors(state.agents);
      const frozen = state.active !== null || state.boardOpen;
      const wasFrozen = prev.active !== null || prev.boardOpen;
      if (frozen !== wasFrozen) {
        this.inputEnabled = !frozen;
        const kb = this.input.keyboard;
        if (kb) kb.enabled = !frozen;
        if (frozen) this.body().setVelocity(0, 0);
      }
    });
    this.renderActors(useOfficeStore.getState().agents);

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
    if (this.inputEnabled) {
      const vx = (this.right() ? 1 : 0) - (this.left() ? 1 : 0);
      const vy = (this.down() ? 1 : 0) - (this.up() ? 1 : 0);
      if (vx || vy) {
        const inv = PLAYER_SPEED / Math.hypot(vx, vy);
        this.body().setVelocity(vx * inv, vy * inv);
        this.animatePlayer(vx, vy);
      } else {
        this.body().setVelocity(0, 0);
        this.idlePlayer();
      }
    } else {
      this.body().setVelocity(0, 0);
      this.idlePlayer();
    }
    this.playerShadow.setPosition(this.player.x, this.player.y + TILE * 0.42);

    // Keep each actor's shadow + labels glued to its (possibly tweening) sprite.
    for (const actor of this.actors.values()) this.positionActorChrome(actor);

    // Nearest *interactable* (desk, seated) agent within reach drives the highlight.
    const px = this.player.x;
    const py = this.player.y;
    let nearest: Actor | null = null;
    let best = PROXIMITY * PROXIMITY;
    for (const actor of this.actors.values()) {
      if (actor.kind !== 'desk' || actor.walking) continue;
      const dist = (px - actor.sprite.x) ** 2 + (py - actor.sprite.y) ** 2;
      if (dist <= best) {
        best = dist;
        nearest = actor;
      }
    }
    if (nearest) this.highlight.setPosition(nearest.sprite.x, nearest.sprite.y).setVisible(true);
    else this.highlight.setVisible(false);

    const id = nearest?.id ?? null;
    if (id !== this.lastNearby) {
      this.lastNearby = id;
      useOfficeStore.getState().setNearby(id);
    }

    // Board-room whiteboard proximity.
    const bDist = (px - this.boardCenter.x) ** 2 + (py - this.boardCenter.y) ** 2;
    const nearBoard = bDist <= (PROXIMITY * 1.3) ** 2;
    if (nearBoard !== this.nearBoardFlag) {
      this.nearBoardFlag = nearBoard;
      useOfficeStore.getState().setNearBoard(nearBoard);
    }
  }

  /** Re-tint the theme-driven objects when the app's light/dark theme flips. */
  applyPalette(palette: OfficePalette) {
    if (!this.alive) return;
    this.palette = palette;
    this.cameras.main.setBackgroundColor(palette.background);
    this.floor.setTint(palette.floor);
    for (const wall of this.walls) wall.setTint(palette.wall);
    for (const label of this.labels) label.setColor(toHex(palette.text));
    for (const actor of this.actors.values()) actor.nameText.setColor(toHex(palette.text));
    this.highlight.setStrokeStyle(2, palette.highlight, 0.9);
  }

  // ---- agents (actors) ---------------------------------------------------

  /** Place working agents at hot desks, idle agents in the lounge; walk on change. */
  private renderActors(agents: OfficeAgent[]) {
    if (!this.alive) return;
    const working = agents.filter((a) => a.status !== 'idle').slice(0, DESK_SEATS.length);
    const idle = agents.filter((a) => a.status === 'idle').slice(0, LOUNGE_SEATS.length);
    const desired: { agent: OfficeAgent; seat: TilePos; kind: 'desk' | 'lounge' }[] = [
      ...working.map((agent, i) => ({ agent, seat: DESK_SEATS[i]!, kind: 'desk' as const })),
      ...idle.map((agent, i) => ({ agent, seat: LOUNGE_SEATS[i]!, kind: 'lounge' as const })),
    ];

    const seen = new Set<string>();
    for (const d of desired) {
      seen.add(d.agent.id);
      const tx = center(d.seat.x);
      const ty = center(d.seat.y) - SEAT_LIFT;
      const existing = this.actors.get(d.agent.id);
      if (!existing) {
        this.actors.set(d.agent.id, this.createActor(d.agent, tx, ty, d.kind));
      } else {
        this.updateActorContent(existing, d.agent);
        existing.kind = d.kind;
        if (existing.tx !== tx || existing.ty !== ty) this.walkActor(existing, tx, ty);
      }
    }

    for (const [id, actor] of this.actors) {
      if (seen.has(id)) continue;
      this.destroyActor(actor);
      this.actors.delete(id);
    }

    const active = useOfficeStore.getState().active;
    if (active && !seen.has(active.id)) useOfficeStore.getState().close();
  }

  private createActor(agent: OfficeAgent, tx: number, ty: number, kind: 'desk' | 'lounge'): Actor {
    const sprite = this.add
      .sprite(tx, ty, charKey('robot', 'down', 0))
      .setScale(CHAR_SCALE)
      .setTint(agentTint(agent.id))
      .setDepth(4);
    const shadow = this.add.ellipse(tx, ty + 13, 16, 6, 0x000000, 0.22).setDepth(3);
    const bubble = this.add
      .text(tx, ty, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e5e7eb',
        backgroundColor: '#0b0b12cc',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(11);
    const nameText = this.add
      .text(tx, ty, '', { fontFamily: 'monospace', fontSize: '11px', color: toHex(this.palette.text) })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(11);
    const statusText = this.add
      .text(tx, ty, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e5e7eb' })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(11);

    const actor: Actor = { id: agent.id, sprite, shadow, bubble, nameText, statusText, kind, tx, ty, walking: false };
    this.updateActorContent(actor, agent);
    this.positionActorChrome(actor);
    return actor;
  }

  private updateActorContent(actor: Actor, agent: OfficeAgent) {
    actor.sprite.setTint(agentTint(agent.id));
    actor.nameText.setText(this.truncate(agent.name));
    const tint = STATUS_TINT[agent.status];
    actor.statusText.setText(STATUS_LABEL[agent.status]).setColor(toHex(tint));
    actor.bubble.setText(STATUS_BUBBLE[agent.status]).setColor(toHex(tint));
  }

  /** Walk an actor to a new seat (e.g. lounge → desk when it starts working). */
  private walkActor(actor: Actor, tx: number, ty: number) {
    actor.tx = tx;
    actor.ty = ty;
    actor.walking = true;
    const dx = tx - actor.sprite.x;
    const dy = ty - actor.sprite.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    actor.sprite.setFlipX(dir === 'side' && dx < 0);
    actor.sprite.play(walkAnim('robot', dir), true);
    actor.tween?.stop();
    actor.tween = this.tweens.add({
      targets: actor.sprite,
      x: tx,
      y: ty,
      duration: Math.max(220, (Math.hypot(dx, dy) / PLAYER_SPEED) * 1000),
      ease: 'Linear',
      onComplete: () => {
        actor.walking = false;
        actor.sprite.anims.stop();
        actor.sprite.setTexture(charKey('robot', 'down', 0)).setFlipX(false);
      },
    });
  }

  /** Glue an actor's shadow + labels to its sprite each frame. */
  private positionActorChrome(actor: Actor) {
    const { x, y } = actor.sprite;
    actor.shadow.setPosition(x, y + 13);
    actor.nameText.setPosition(x, y - 19);
    actor.statusText.setPosition(x, y - 10);
    actor.bubble.setPosition(x + 12, y - 15);
  }

  private destroyActor(actor: Actor) {
    actor.tween?.stop();
    actor.sprite.destroy();
    actor.shadow.destroy();
    actor.bubble.destroy();
    actor.nameText.destroy();
    actor.statusText.destroy();
  }

  // ---- player ------------------------------------------------------------

  private animatePlayer(vx: number, vy: number) {
    if (Math.abs(vx) > Math.abs(vy)) {
      this.facing = 'side';
      this.player.setFlipX(vx < 0);
    } else {
      this.facing = vy < 0 ? 'up' : 'down';
      this.player.setFlipX(false);
    }
    this.player.anims.play(walkAnim('human', this.facing), true);
  }

  private idlePlayer() {
    this.player.anims.stop();
    this.player.setTexture(charKey('human', this.facing, 0));
  }

  private tryInteract() {
    if (!this.inputEnabled) return;
    if (this.nearBoardFlag) {
      useOfficeStore.getState().openBoard();
      return;
    }
    if (this.lastNearby) useOfficeStore.getState().open(this.lastNearby);
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

  // ---- room construction -------------------------------------------------

  private buildRugs() {
    for (const r of RUGS) {
      this.add
        .rectangle((r.x + r.w / 2) * TILE, (r.y + r.h / 2) * TILE, r.w * TILE, r.h * TILE, r.color, 0.55)
        .setDepth(-8);
    }
  }

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

  /** Hot desks (work zone). Furniture always shows; agents sit on top when assigned. */
  private buildDesks() {
    for (const { x, y } of DESK_SEATS) {
      const cx = center(x);
      const cy = center(y);
      this.add.image(cx, cy + TILE * 0.25, TEX.chair).setDepth(2);
      const desk = this.physics.add.staticImage(cx, cy + TILE * 0.3, TEX.desk).setDepth(6);
      this.solids.push(desk);
      this.add.image(cx, cy + TILE * 0.18, TEX.monitor).setDepth(7);
    }
  }

  private buildLounge() {
    for (const c of COUCHES) this.solids.push(this.staticDecor(c, TEX.couch, 2));
    for (const a of ARMCHAIRS) this.solids.push(this.staticDecor(a, TEX.armchair, 2));
    this.solids.push(this.staticDecor(TV_POS, TEX.tv, 5));
    this.add.image(center(CONSOLE_POS.x), center(CONSOLE_POS.y), TEX.console).setDepth(5);
  }

  private buildBoardroom() {
    for (const c of TABLE_CHAIRS) this.add.image(center(c.x), center(c.y), TEX.chair).setDepth(1);
    this.solids.push(this.staticDecor(TABLE_POS, TEX.table, 2));
    const board = this.add.image(center(BOARD_POS.x), center(BOARD_POS.y), TEX.board).setDepth(6);
    this.boardCenter = { x: board.x, y: board.y + TILE };
  }

  private buildPlants() {
    for (const p of PLANTS) this.add.image(center(p.x), center(p.y), TEX.plant).setDepth(3);
  }

  private buildLabels() {
    for (const l of ZONE_LABELS) {
      const label = this.add
        .text(center(l.x), center(l.y), l.text, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: toHex(this.palette.text),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setAlpha(0.55)
        .setDepth(11);
      this.labels.push(label);
    }
  }

  /** Add a static (collidable) furniture image at a tile, return it for `solids`. */
  private staticDecor(pos: TilePos, key: string, depth: number) {
    return this.physics.add.staticImage(center(pos.x), center(pos.y), key).setDepth(depth);
  }

  private buildPlayer() {
    const sx = center(PLAYER_SPAWN.x);
    const sy = center(PLAYER_SPAWN.y);
    this.playerShadow = this.add
      .ellipse(sx, sy + TILE * 0.42, TILE * 0.45, TILE * 0.18, 0x000000, 0.25)
      .setDepth(7);
    this.player = this.add
      .sprite(sx, sy, charKey('human', 'down', 0))
      .setScale(CHAR_SCALE)
      .setTint(this.palette.player)
      .setDepth(8);
    this.physics.add.existing(this.player);
    this.body().setSize(10, 7).setOffset(3, 12);
    this.body().setCollideWorldBounds(true);
  }

  private buildVignette(worldW: number, worldH: number) {
    const key = 'office-vignette';
    if (!this.textures.exists(key)) {
      const canvas = this.textures.createCanvas(key, worldW, worldH);
      const ctx = canvas?.getContext();
      if (ctx) {
        const grd = ctx.createRadialGradient(
          worldW / 2,
          worldH / 2,
          Math.min(worldW, worldH) * 0.28,
          worldW / 2,
          worldH / 2,
          Math.max(worldW, worldH) * 0.62,
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.3)');
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
