import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { STATUS_LABEL, STATUS_TINT, type OfficeAgent, type OfficeStatus } from '@/lib/office/agents';
import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from '@/lib/office/dimensions';
import {
  ARMCHAIRS,
  BOARD_POS,
  blockedGrid,
  BOOKSHELVES,
  COFFEE_POS,
  CONSOLE_POS,
  COUCHES,
  COUNTER_POS,
  DESK_SEATS,
  DOOR_POS,
  LAYOUT,
  LOUNGE_SEATS,
  PLANTS,
  PLAYER_SPAWN,
  READING_CHAIR,
  ROOMS,
  STOOL_POS,
  TABLE_CHAIRS,
  TABLE_POS,
  TV_POS,
  type TilePos,
} from '@/lib/office/layout';
import { buildOfficePalette, ROOM_STYLES, type OfficePalette } from '@/lib/office/theme';
import { agentTint, charKey, ensureOfficeAnims, ensureOfficeTextures, TEX, walkAnim } from '@/lib/office/textures';

// Phase 9 office: a sprite-based, multi-room floor plan (work · board · library
// over lounge · kitchen · corner office, connected by doorways — see layout.ts).
// Working agents (robots) sit at WORK hot desks (interactable); idle agents chill
// in the LOUNGE; the BOARD whiteboard opens the projects panel; the KITCHEN coffee
// machine toggles a break. Each room gets its own translucent floor accent + label
// over the theme-tinted base, so the canvas still follows light/dark.
// See lib/office/{layout,textures,theme}.ts.

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
  tween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;
  /** Idle lounge agent that's sleeping (vs gaming) — drives the animated zzz. */
  sleeping: boolean;
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
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  /** Pathfinding walkability grid (true = blocked); seats handled specially. */
  private blocked: boolean[][] = [];
  private boardCenter = { x: 0, y: 0 };
  private kitchenCenter = { x: 0, y: 0 };
  private lastNearby: string | null = null;
  private nearBoardFlag = false;
  private nearKitchenFlag = false;
  /** ☕ shown over the player while on a coffee break. */
  private breakIcon!: Phaser.GameObjects.Text;
  private facing: 'down' | 'up' | 'side' = 'down';
  /** Click-to-walk: pixel waypoints the player is auto-following, or null. */
  private playerPath: { x: number; y: number }[] | null = null;
  private playerPathDeadline = 0;
  /** Animation phase for the sleeping agents' "z / zz / zzz" bubble. */
  private zzzPhase = 0;
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
    this.blocked = blockedGrid();
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

    this.buildRoomFloors();
    this.buildWalls();
    this.buildDesks();
    this.buildLounge();
    this.buildKitchen();
    this.buildBoardroom();
    this.buildLibrary();
    this.buildCornerOffice();
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
    this.input.on('pointerdown', this.onPointerDown, this);

    this.alive = true;

    // Animate the sleeping agents' "z / zz / zzz" bubble. Auto-removed on shutdown.
    this.time.addEvent({ delay: 450, loop: true, callback: this.tickIdleBubbles, callbackScope: this });

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
    this.movePlayer();
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

    // Kitchen coffee-machine proximity.
    const kDist = (px - this.kitchenCenter.x) ** 2 + (py - this.kitchenCenter.y) ** 2;
    const nearKitchen = kDist <= (PROXIMITY * 1.3) ** 2;
    if (nearKitchen !== this.nearKitchenFlag) {
      this.nearKitchenFlag = nearKitchen;
      useOfficeStore.getState().setNearKitchen(nearKitchen);
    }

    // ☕ floats over the player while on a break.
    this.breakIcon.setPosition(this.player.x + 11, this.player.y - 16);
    this.breakIcon.setVisible(useOfficeStore.getState().onBreak);
  }

  /** Re-tint the theme-driven objects when the app's light/dark theme flips. */
  applyPalette(palette: OfficePalette) {
    if (!this.alive) return;
    this.palette = palette;
    this.cameras.main.setBackgroundColor(palette.background);
    this.floor.setTint(palette.floor);
    for (const wall of this.walls) wall.setTint(palette.wall);
    // Room labels use fixed per-room accents, so they don't re-tint with the theme.
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
      let actor = this.actors.get(d.agent.id);
      if (!actor) {
        actor = this.createActor(d.agent, tx, ty, d.kind);
        this.actors.set(d.agent.id, actor);
      } else {
        this.updateActorContent(actor, d.agent);
        actor.kind = d.kind;
        if (actor.tx !== tx || actor.ty !== ty) this.walkActor(actor, tx, ty);
      }
      this.setActivity(actor, d.agent);
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

    const actor: Actor = {
      id: agent.id,
      sprite,
      shadow,
      bubble,
      nameText,
      statusText,
      kind,
      tx,
      ty,
      walking: false,
      sleeping: false,
    };
    this.updateActorContent(actor, agent);
    this.positionActorChrome(actor);
    return actor;
  }

  /**
   * Idle agents in the lounge either **sleep** (animated zzz) or **game** (▶),
   * split deterministically by id; working agents keep their status bubble.
   */
  private setActivity(actor: Actor, agent: OfficeAgent) {
    if (agent.status !== 'idle') {
      actor.sleeping = false;
      return;
    }
    const gaming = this.isGamer(agent.id);
    actor.sleeping = !gaming;
    actor.bubble.setColor(toHex(STATUS_TINT.idle)).setText(gaming ? '▶' : 'z'.repeat(this.zzzPhase + 1));
  }

  /** Deterministic "is this idle agent gaming (vs sleeping)?" split by id. */
  private isGamer(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) >>> 0;
    return hash % 2 === 0;
  }

  /** Cycle the sleeping agents' bubble z → zz → zzz. */
  private tickIdleBubbles() {
    if (!this.alive) return;
    this.zzzPhase = (this.zzzPhase + 1) % 3;
    const z = 'z'.repeat(this.zzzPhase + 1);
    for (const actor of this.actors.values()) if (actor.sleeping) actor.bubble.setText(z);
  }

  private updateActorContent(actor: Actor, agent: OfficeAgent) {
    actor.sprite.setTint(agentTint(agent.id));
    actor.nameText.setText(this.truncate(agent.name));
    const tint = STATUS_TINT[agent.status];
    actor.statusText.setText(STATUS_LABEL[agent.status]).setColor(toHex(tint));
    actor.bubble.setText(STATUS_BUBBLE[agent.status]).setColor(toHex(tint));
  }

  /**
   * Walk an actor to a new seat (e.g. lounge → desk when it starts working),
   * routing around walls + furniture via A* and tweening through the waypoints.
   * Falls back to a direct tween if no grid path is found.
   */
  private walkActor(actor: Actor, tx: number, ty: number) {
    actor.tx = tx;
    actor.ty = ty;
    actor.walking = true;
    actor.tween?.stop();

    const start = this.tileOf(actor.sprite.x, actor.sprite.y);
    const goal = this.tileOf(tx, ty);
    const tiles = this.findPath(start, goal);

    // Waypoints in px: skip the start tile; snap the last to the exact seat.
    const pts = tiles.slice(1).map((t) => ({ x: center(t.x), y: center(t.y) }));
    if (pts.length === 0) pts.push({ x: tx, y: ty });
    else pts[pts.length - 1] = { x: tx, y: ty };

    const settle = () => {
      actor.walking = false;
      actor.sprite.anims.stop();
      actor.sprite.setTexture(charKey('robot', 'down', 0)).setFlipX(false);
    };

    let prev = { x: actor.sprite.x, y: actor.sprite.y };
    const tweens = pts.map((p) => {
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
      return {
        x: p.x,
        y: p.y,
        duration: Math.max(140, (dist / PLAYER_SPEED) * 1000),
        ease: 'Linear',
        onStart: () => this.faceActor(actor, p),
      };
    });

    actor.tween = this.tweens.chain({ targets: actor.sprite, tweens, onComplete: settle });
  }

  /** Point a robot toward `target` and play its walk cycle. */
  private faceActor(actor: Actor, target: { x: number; y: number }) {
    const dx = target.x - actor.sprite.x;
    const dy = target.y - actor.sprite.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    actor.sprite.setFlipX(dir === 'side' && dx < 0);
    actor.sprite.play(walkAnim('robot', dir), true);
  }

  private tileOf(px: number, py: number) {
    return {
      x: Phaser.Math.Clamp(Math.floor(px / TILE), 0, COLS - 1),
      y: Phaser.Math.Clamp(Math.floor(py / TILE), 0, ROWS - 1),
    };
  }

  /**
   * 4-directional A* over the blocked grid. The start and goal tiles are allowed
   * even when blocked (an agent sits *on* furniture), so the route leaves one
   * seat and arrives at another without cutting through anything between.
   */
  private findPath(
    start: { x: number; y: number },
    goal: { x: number; y: number },
    openEnds = true,
  ): { x: number; y: number }[] {
    const key = (x: number, y: number) => y * COLS + x;
    const passable = (x: number, y: number) =>
      y >= 0 &&
      y < ROWS &&
      x >= 0 &&
      x < COLS &&
      (!this.blocked[y]![x] || (openEnds && x === goal.x && y === goal.y));

    const startK = key(start.x, start.y);
    const goalK = key(goal.x, goal.y);
    const came = new Map<number, number>();
    const g = new Map<number, number>([[startK, 0]]);
    const open = new Set<number>([startK]);
    const heur = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y);

    while (open.size) {
      let cur = -1;
      let bestF = Infinity;
      for (const k of open) {
        const f = (g.get(k) ?? Infinity) + heur(k % COLS, Math.floor(k / COLS));
        if (f < bestF) {
          bestF = f;
          cur = k;
        }
      }
      if (cur === goalK) break;
      open.delete(cur);
      const cx = cur % COLS;
      const cy = Math.floor(cur / COLS);
      const neighbours: [number, number][] = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbours) {
        if (!passable(nx, ny)) continue;
        const nk = key(nx, ny);
        const tentative = (g.get(cur) ?? Infinity) + 1;
        if (tentative < (g.get(nk) ?? Infinity)) {
          came.set(nk, cur);
          g.set(nk, tentative);
          open.add(nk);
        }
      }
    }

    if (!came.has(goalK) && startK !== goalK) return []; // unreachable → caller falls back
    const path: { x: number; y: number }[] = [];
    let k: number | undefined = goalK;
    while (k !== undefined) {
      path.unshift({ x: k % COLS, y: Math.floor(k / COLS) });
      k = came.get(k);
    }
    return path;
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

  /** Player movement: manual WASD/arrows, else follow a click-to-walk path. */
  private movePlayer() {
    if (!this.inputEnabled) {
      this.playerPath = null;
      this.body().setVelocity(0, 0);
      this.idlePlayer();
      return;
    }

    const vx = (this.right() ? 1 : 0) - (this.left() ? 1 : 0);
    const vy = (this.down() ? 1 : 0) - (this.up() ? 1 : 0);
    if (vx || vy) {
      this.playerPath = null; // manual input cancels click-to-walk
      const inv = PLAYER_SPEED / Math.hypot(vx, vy);
      this.body().setVelocity(vx * inv, vy * inv);
      this.animatePlayer(vx, vy);
      return;
    }

    if (this.playerPath?.length) {
      if (this.time.now > this.playerPathDeadline) {
        this.playerPath = null; // gave up (e.g. nudged into furniture)
      } else {
        const wp = this.playerPath[0]!;
        const dx = wp.x - this.player.x;
        const dy = wp.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          this.playerPath.shift();
        } else {
          const inv = PLAYER_SPEED / d;
          this.body().setVelocity(dx * inv, dy * inv);
          this.animatePlayer(dx, dy);
          return;
        }
      }
    }

    this.body().setVelocity(0, 0);
    this.idlePlayer();
  }

  /** Click-to-walk: pathfind the player to the clicked (walkable) tile. */
  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.alive || !this.inputEnabled) return;
    const goal = this.nearestOpenTile(this.tileOf(pointer.worldX, pointer.worldY));
    if (!goal) return;
    const start = this.tileOf(this.player.x, this.player.y);
    const tiles = this.findPath(start, goal, false);
    if (tiles.length < 2) {
      this.playerPath = null;
      return;
    }
    const pts = tiles.slice(1).map((t) => ({ x: center(t.x), y: center(t.y) }));
    this.playerPath = pts;
    // Bail out if we don't arrive within ~2× the expected travel time (stuck).
    this.playerPathDeadline = this.time.now + (pts.length * TILE * 2 * 1000) / PLAYER_SPEED + 600;
  }

  private isOpen(x: number, y: number) {
    return y >= 0 && y < ROWS && x >= 0 && x < COLS && !this.blocked[y]![x];
  }

  /** The clicked tile if walkable, else the nearest walkable tile within reach. */
  private nearestOpenTile(t: { x: number; y: number }): { x: number; y: number } | null {
    if (this.isOpen(t.x, t.y)) return t;
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.isOpen(t.x + dx, t.y + dy)) return { x: t.x + dx, y: t.y + dy };
        }
      }
    }
    return null;
  }

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
    if (this.nearKitchenFlag) {
      useOfficeStore.getState().toggleBreak();
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

  /**
   * Tint each room's interior floor with its own translucent accent so every
   * room reads as a distinct space, while the theme-driven base floor (and
   * light/dark flip) still shows through underneath.
   */
  private buildRoomFloors() {
    for (const room of ROOMS) {
      const style = ROOM_STYLES[room.id];
      this.add
        .rectangle((room.x + room.w / 2) * TILE, (room.y + room.h / 2) * TILE, room.w * TILE, room.h * TILE, style.floor, 0.32)
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

  /** Kitchenette nook: counter + stool (decor) + the interactable coffee machine. */
  private buildKitchen() {
    this.add.image(center(COUNTER_POS.x), center(COUNTER_POS.y), TEX.counter).setDepth(2);
    this.add.image(center(STOOL_POS.x), center(STOOL_POS.y), TEX.stool).setDepth(3);
    const machine = this.add.image(center(COFFEE_POS.x), center(COFFEE_POS.y), TEX.coffee).setDepth(3);
    this.kitchenCenter = { x: machine.x, y: machine.y };
  }

  private buildBoardroom() {
    for (const c of TABLE_CHAIRS) this.add.image(center(c.x), center(c.y), TEX.chair).setDepth(1);
    this.solids.push(this.staticDecor(TABLE_POS, TEX.table, 2));
    const board = this.add.image(center(BOARD_POS.x), center(BOARD_POS.y), TEX.board).setDepth(6);
    this.boardCenter = { x: board.x, y: board.y + TILE };
  }

  /** Library: bookshelves lining the walls + a reading chair (decor for now; the
   *  searchable library modal is Phase 9 C, anchored at BOOKSHELF_POS). */
  private buildLibrary() {
    for (const s of BOOKSHELVES) this.add.image(center(s.x), center(s.y), TEX.bookshelf).setDepth(3);
    this.add.image(center(READING_CHAIR.x), center(READING_CHAIR.y), TEX.armchair).setDepth(2);
  }

  /** Corner office: a door + welcome mat the player will step through (Phase 9 F). */
  private buildCornerOffice() {
    this.add
      .rectangle(center(DOOR_POS.x), center(DOOR_POS.y) + TILE * 0.4, TILE * 0.9, TILE * 0.35, 0x6ee7b7, 0.25)
      .setDepth(1); // welcome mat
    this.add.image(center(DOOR_POS.x), center(DOOR_POS.y), TEX.door).setDepth(5);
  }

  private buildPlants() {
    for (const p of PLANTS) this.add.image(center(p.x), center(p.y), TEX.plant).setDepth(3);
  }

  /** One bold, accent-coloured label per room, anchored on its top wall. */
  private buildLabels() {
    for (const room of ROOMS) {
      this.add
        .text(center(room.lx), center(room.ly), room.label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: toHex(ROOM_STYLES[room.id].accent),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setAlpha(0.7)
        .setDepth(11);
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

    this.breakIcon = this.add
      .text(sx, sy, '☕', { fontSize: '13px' })
      .setOrigin(0.5)
      .setResolution(2)
      .setVisible(false)
      .setDepth(11);
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
