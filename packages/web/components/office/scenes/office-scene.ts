import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { STATUS_LABEL, STATUS_TINT, type OfficeAgent, type OfficeStatus } from '@/lib/office/agents';
import { dayNightTint } from '@/lib/office/daynight';
import { OFFICE_COLS, OFFICE_ROWS, OFFICE_TILE } from '@/lib/office/dimensions';
import {
  ARMCHAIRS,
  ASTRO_TURF,
  BOARD_POS,
  blockedGrid,
  BOOKSHELF_POS,
  BOOKSHELVES,
  COFFEE_POS,
  CONSOLE_POS,
  COUCHES,
  COUNTER_POS,
  DOOR_POS,
  GAME_TABLE_POS,
  LAYOUT,
  LOUNGE_SEATS,
  PING_PONG,
  PLANTS,
  PLAYER_SPAWN,
  POOL,
  POOL_TABLE,
  READING_CHAIR,
  ROOMS,
  statusToRoom,
  type RoomId,
  RUGS,
  STOOL_POS,
  TABLE_CHAIRS,
  TABLE_POS,
  TV_POS,
  type TilePos,
  WALL_ART,
} from '@/lib/office/layout';
import { buildFloorTileData, getDeskSeats } from '@/lib/office/map-data';
import { assignStableSeats } from '@/lib/office/seats';
import { buildOfficePalette, ROOM_STYLES, roomSignStyle, type OfficePalette } from '@/lib/office/theme';
import {
  agentTint,
  charKey,
  ensureOfficeAnims,
  ensureOfficeTileset,
  ensureOfficeTextures,
  plantTexture,
  robotVariant,
  TEX,
  TILESET_KEY,
  walkAnim,
  type CharKind,
} from '@/lib/office/textures';

// Phase 9 office: a sprite-based, multi-room floor plan (work · board · library
// over agent pool · communal area · corner office, connected by doorways — see
// layout.ts). Working agents (robots) sit at WORK hot desks (interactable); idle
// agents lounge in the AGENT POOL; the BOARD whiteboard opens the projects panel;
// the COMMUNAL coffee machine toggles a break. Each room gets its own translucent
// floor accent + a wall-mounted name plate (A3) over the theme-tinted base, so the
// canvas still follows light/dark.
// See lib/office/{layout,textures,theme}.ts.

const TILE = OFFICE_TILE;
const COLS = OFFICE_COLS;
const ROWS = OFFICE_ROWS;
const PLAYER_SPEED = 150;
/** Camera zoom — the player sees a 2/3-sized slice of the world at once; the camera
 *  follows them through the full 34×22 tile map. */
const ZOOM = 1.5;
/** How close (px) the player must be to a desk/board to "reach" it. */
const PROXIMITY = TILE * 1.6;
/** How close (px) the player must be for an agent's nameplate to appear. */
const NAMEPLATE_RANGE = TILE * 4;
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

/**
 * Phase 8 C2: per-tool shadow glow. Maps tool categories to distinct colours so
 * a glance at the floor tells you what an agent is doing. Falls back to amber for
 * unrecognised tools (forward-compatible as new tools are added).
 */
const TOOL_GLOW: Record<string, number> = {
  Edit: 0x22c55e,
  Write: 0x22c55e,
  MultiEdit: 0x22c55e,
  Bash: 0xf97316,
  execute_command: 0xf97316,
  Read: 0x3b82f6,
  WebFetch: 0x3b82f6,
  WebSearch: 0x3b82f6,
  Agent: 0xa855f7,
};
const TOOL_GLOW_ALPHA = 0.65;
const SHADOW_DEFAULT = { color: 0x000000, alpha: 0.22 };

function toolShadowTint(tool: string | undefined): { color: number; alpha: number } {
  if (!tool) return SHADOW_DEFAULT;
  const color = TOOL_GLOW[tool] ?? (tool.startsWith('mcp') ? 0xa855f7 : 0xfbbf24);
  return { color, alpha: TOOL_GLOW_ALPHA };
}

/** Phase 9 B1: brand-aligned accent per agent CLI. Unknown CLIs get gray. */
const CLI_BADGE_COLOR: Record<string, number> = {
  claude: 0xe6521a,    // Anthropic orange
  gemini: 0x4285f4,    // Google blue
  codex: 0x10a37f,     // OpenAI green
  opencode: 0x10a37f,  // OpenAI green (opencode wraps codex)
  aider: 0x7c3aed,     // Purple
};
const CLI_BADGE_DEFAULT = 0x6b7280; // gray for unknown
const CLI_BADGE_RADIUS = 4;

/** A live agent rendered in the room — a robot sprite + its labels/shadow. */
type Actor = {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  bubble: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  /** Small provider-colored dot (top-right of sprite) — Phase 9 B1. */
  providerBadge: Phaser.GameObjects.Arc;
  /** Where the agent currently belongs — only desks are interactable. */
  kind: 'desk' | 'lounge';
  /** Target seat centre (px). */
  tx: number;
  ty: number;
  walking: boolean;
  tween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;
  /** Idle agent lounging on a sun lounger — drives the animated zzz. */
  sleeping: boolean;
  /** Robot design index (by agent id) — distinct silhouette/accent per agent. */
  variant: number;
  /** Mid-swim in the pool (G3) — suppresses lounging bubble + re-seat walks. */
  swimming: boolean;
  /** Wake ripple that trails a swimmer; removed when they climb out. */
  ripple?: Phaser.GameObjects.Ellipse;
  /** Pulse tween running while the agent needs attention (D1). */
  attentionTween?: Phaser.Tweens.Tween;
};

class OfficeScene extends Phaser.Scene {
  private palette!: OfficePalette;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private highlight!: Phaser.GameObjects.Arc;
  private floor!: Phaser.Tilemaps.TilemapLayer;
  /** Day/night floor wash (B2) — a subtle time-of-day colour over the ground, below
   *  furniture/characters; refreshed on a timer + on theme flip. See lib/office/daynight. */
  private dayNight!: Phaser.GameObjects.Rectangle;
  /** Pool water (TileSprite) — scrolled each frame for a gentle shimmer (G2). */
  private water?: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly actors = new Map<string, Actor>();
  /** Stable seat claims: agent id → desk/lounge seat index, kept until it leaves. */
  private readonly deskByAgent = new Map<string, number>();
  private readonly loungeByAgent = new Map<string, number>();
  private readonly walls: Phaser.GameObjects.Image[] = [];
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  /** Wall-mounted room name plates (A3) — redrawn on theme flip (fill is theme-driven). */
  private readonly roomSigns: { plate: Phaser.GameObjects.Graphics; id: RoomId; rect: Phaser.Geom.Rectangle }[] = [];
  /** Pathfinding walkability grid (true = blocked); seats handled specially. */
  private blocked: boolean[][] = [];
  private boardCenter = { x: 0, y: 0 };
  private kitchenCenter = { x: 0, y: 0 };
  private libraryCenter = { x: 0, y: 0 };
  private playstationCenter = { x: 0, y: 0 };
  private doorCenter = { x: 0, y: 0 };
  private lastNearby: string | null = null;
  private nearBoardFlag = false;
  private nearKitchenFlag = false;
  private nearLibraryFlag = false;
  private nearPlaystationFlag = false;
  private nearDoorFlag = false;
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

    ensureOfficeTileset(this);
    const floorData = buildFloorTileData();
    const tileMap = this.make.tilemap({ data: floorData, tileWidth: TILE, tileHeight: TILE });
    const tileSet = tileMap.addTilesetImage('office-tiles', TILESET_KEY, TILE, TILE, 0, 0);
    this.floor = tileMap.createLayer(0, tileSet!, 0, 0)!
      .setDepth(-10)
      .setTint(this.palette.floor);

    this.buildRoomFloors();
    this.buildRugs();
    this.buildDayNight(worldW, worldH);
    this.buildWalls();
    this.buildDesks();
    this.buildPool();
    this.buildKitchen();
    this.buildBoardroom();
    this.buildLibrary();
    this.buildCornerOffice();
    this.buildPlants();
    this.buildWallArt();
    this.buildLabels();
    this.buildPlayer();

    this.physics.add.collider(this.player, this.solids);

    this.highlight = this.add
      .circle(0, 0, TILE * 0.85, this.palette.highlight, 0)
      .setStrokeStyle(2, this.palette.highlight, 0.9)
      .setVisible(false)
      .setDepth(9);

    this.buildVignette(worldW, worldH);

    // Camera follow (A2): zoom in so the player navigates through the full map.
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.fadeIn(200, 0, 0, 0);

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

    // Animate the lounging agents' "z / zz / zzz" bubble. Auto-removed on shutdown.
    this.time.addEvent({ delay: 450, loop: true, callback: this.tickIdleBubbles, callbackScope: this });
    // Occasionally send a lounging agent for a swim (G3).
    this.time.addEvent({ delay: 4500, loop: true, callback: this.maybeSwim, callbackScope: this });
    // Gentle idle wander (C3): occasionally a lounging agent gets up and mills around.
    this.time.addEvent({ delay: 6700, loop: true, callback: this.maybeWander, callbackScope: this });
    // Drift the day/night floor wash with the clock (B2) — same cadence the time
    // theme re-evaluates the light/dark flip. Auto-removed on shutdown.
    this.time.addEvent({ delay: 60_000, loop: true, callback: this.refreshDayNight, callbackScope: this });

    this.unsub = useOfficeStore.subscribe((state, prev) => {
      if (!this.alive) return;
      if (state.agents !== prev.agents) this.renderActors(state.agents);
      const frozen = state.active !== null || state.boardOpen || state.libraryOpen || state.playstationOpen;
      const wasFrozen = prev.active !== null || prev.boardOpen || prev.libraryOpen || prev.playstationOpen;
      if (frozen !== wasFrozen) {
        this.inputEnabled = !frozen;
        const kb = this.input.keyboard;
        if (kb) kb.enabled = !frozen;
        if (frozen) this.body().setVelocity(0, 0);
      }
      if (state.playerVariant !== prev.playerVariant) {
        this.player.setTexture(this.playerCharKey(this.facing, 0));
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

    // Gentle pool shimmer (G2) + keep each actor's chrome glued to its sprite; a
    // swimmer's wake ripple trails just below it.
    if (this.water) {
      this.water.tilePositionX += 0.15;
      this.water.tilePositionY += 0.08;
    }
    // Nameplate range check uses player position — compute first.
    const px = this.player.x;
    const py = this.player.y;
    const nrSq = NAMEPLATE_RANGE * NAMEPLATE_RANGE;

    for (const actor of this.actors.values()) {
      this.positionActorChrome(actor);
      if (actor.swimming && actor.ripple) actor.ripple.setPosition(actor.sprite.x, actor.sprite.y + 8);
      // Show nameplate when the player is within NAMEPLATE_RANGE; hide otherwise.
      const distSq = (px - actor.sprite.x) ** 2 + (py - actor.sprite.y) ** 2;
      const visible = distSq <= nrSq;
      if (actor.nameText.alpha !== (visible ? 1 : 0)) {
        actor.nameText.setAlpha(visible ? 1 : 0);
        actor.statusText.setAlpha(visible ? 1 : 0);
      }
    }

    // Nearest *interactable* (desk, seated) agent within reach drives the highlight.
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

    // Library bookshelf proximity.
    const lDist = (px - this.libraryCenter.x) ** 2 + (py - this.libraryCenter.y) ** 2;
    const nearLibrary = lDist <= (PROXIMITY * 1.3) ** 2;
    if (nearLibrary !== this.nearLibraryFlag) {
      this.nearLibraryFlag = nearLibrary;
      useOfficeStore.getState().setNearLibrary(nearLibrary);
    }

    // PlayStation console proximity.
    const psDist = (px - this.playstationCenter.x) ** 2 + (py - this.playstationCenter.y) ** 2;
    const nearPlaystation = psDist <= (PROXIMITY * 1.5) ** 2;
    if (nearPlaystation !== this.nearPlaystationFlag) {
      this.nearPlaystationFlag = nearPlaystation;
      useOfficeStore.getState().setNearPlaystation(nearPlaystation);
    }

    // Corner-office door proximity.
    const dDist = (px - this.doorCenter.x) ** 2 + (py - this.doorCenter.y) ** 2;
    const nearDoor = dDist <= (PROXIMITY * 1.3) ** 2;
    if (nearDoor !== this.nearDoorFlag) {
      this.nearDoorFlag = nearDoor;
      useOfficeStore.getState().setNearDoor(nearDoor);
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
    // Room name plates: text/border are fixed per-room accents, but the plate fill
    // is theme-driven — redraw it so the signs flip with light/dark.
    for (const sign of this.roomSigns) this.drawSignPlate(sign.plate, sign.id, sign.rect);
    for (const actor of this.actors.values()) actor.nameText.setColor(toHex(palette.text));
    this.highlight.setStrokeStyle(2, palette.highlight, 0.9);
    // The time theme flips light/dark on the same 08:00/18:00 boundary the day/night
    // wash crosses — re-tint it here so floor base + wash stay in sync on the flip.
    this.refreshDayNight();
  }

  // ---- agents (actors) ---------------------------------------------------

  /**
   * Place agents in their task-status-derived room (Phase 31 B).
   * - wip     → WORK hot desks
   * - waiting → BOARD room conference chairs
   * - done    → AGENT POOL lounge
   * - backlog/todo/abandoned/no-task → not on floor (hidden)
   */
  private renderActors(agents: OfficeAgent[]) {
    if (!this.alive) return;

    // Partition by task-status room target; fall back to session-status for
    // agents without a linked task (treat as wip so they appear at desks).
    const deskSeats = getDeskSeats();
    const deskAgents = agents
      .filter((a) => statusToRoom(a.taskStatus ?? 'wip') === 'work')
      .slice(0, deskSeats.length);
    const boardAgents = agents
      .filter((a) => statusToRoom(a.taskStatus) === 'board')
      .slice(0, TABLE_CHAIRS.length);
    const loungeAgents = agents
      .filter((a) => statusToRoom(a.taskStatus) === 'pool' || a.status === 'idle')
      .slice(0, LOUNGE_SEATS.length);

    const desired: { agent: OfficeAgent; seat: TilePos; kind: 'desk' | 'lounge' }[] = [
      ...assignStableSeats(deskAgents, deskSeats.length, this.deskByAgent).map((s) => ({
        agent: s.agent,
        seat: deskSeats[s.seatIndex]!,
        kind: 'desk' as const,
      })),
      // Waiting agents sit at board-room chairs (stable assignment reuses deskByAgent map).
      ...assignStableSeats(boardAgents, TABLE_CHAIRS.length, this.deskByAgent).map((s) => ({
        agent: s.agent,
        seat: TABLE_CHAIRS[s.seatIndex]!,
        kind: 'desk' as const,
      })),
      ...assignStableSeats(loungeAgents, LOUNGE_SEATS.length, this.loungeByAgent).map((s) => ({
        agent: s.agent,
        seat: LOUNGE_SEATS[s.seatIndex]!,
        kind: 'lounge' as const,
      })),
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
    const variant = robotVariant(agent.id);
    const sprite = this.add
      .sprite(tx, ty, charKey('robot', 'down', 0, variant))
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
      .text(tx, ty, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: toHex(this.palette.text),
        backgroundColor: '#0b0b12bb',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setAlpha(0)
      .setDepth(11);
    const statusText = this.add
      .text(tx, ty, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#9ca3af',
        backgroundColor: '#0b0b12aa',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setAlpha(0)
      .setDepth(11);

    const badgeColor = CLI_BADGE_COLOR[agent.agentCli ?? ''] ?? CLI_BADGE_DEFAULT;
    const providerBadge = this.add
      .arc(tx + 8, ty - 10, CLI_BADGE_RADIUS, 0, 360, false, badgeColor, 0.9)
      .setDepth(12);

    const actor: Actor = {
      id: agent.id,
      sprite,
      shadow,
      bubble,
      nameText,
      statusText,
      providerBadge,
      kind,
      tx,
      ty,
      walking: false,
      sleeping: false,
      variant,
      swimming: false,
    };
    this.updateActorContent(actor, agent);
    this.positionActorChrome(actor);
    return actor;
  }

  /**
   * Idle agents lounge on the pool's sun loungers (animated zzz); working agents
   * keep their status bubble. A swimmer's bubble is cleared while it's in the pool.
   */
  private setActivity(actor: Actor, agent: OfficeAgent) {
    if (agent.status !== 'idle' || actor.swimming) {
      actor.sleeping = false;
      // C2: apply a pose driven by the live activity phase. Only changes the
      // animation when the agent has settled (not mid-walk) so we don't fight
      // the walk-tween's own frame management.
      if (!actor.walking) this.applyPose(actor, agent);
      return;
    }
    actor.sleeping = true;
    actor.bubble.setColor(toHex(STATUS_TINT.idle)).setText('z'.repeat(this.zzzPhase + 1));
  }

  /**
   * C2: set a sprite pose matching the live activity phase.
   * - `running` → slow typing animation (walk cycle at 2 fps).
   * - `blocked`  → still frame 1 (standing upright, awaiting input).
   * - `idle` / unknown → still frame 0 (neutral seated position).
   */
  private applyPose(actor: Actor, agent: OfficeAgent) {
    const phase = agent.liveActivity?.phase;
    if (phase === 'running') {
      // Slow "typing" — reuse the down-facing walk cycle at a fraction of walk speed.
      actor.sprite.play({ key: walkAnim('robot', 'down', actor.variant), frameRate: 2 }, true);
    } else if (phase === 'blocked') {
      actor.sprite.anims.stop();
      actor.sprite.setTexture(charKey('robot', 'down', 1, actor.variant)).setFlipX(false);
    } else {
      actor.sprite.anims.stop();
      actor.sprite.setTexture(charKey('robot', 'down', 0, actor.variant)).setFlipX(false);
    }
  }

  /** Cycle the lounging agents' bubble z → zz → zzz. */
  private tickIdleBubbles() {
    if (!this.alive) return;
    this.zzzPhase = (this.zzzPhase + 1) % 3;
    const z = 'z'.repeat(this.zzzPhase + 1);
    for (const actor of this.actors.values()) if (actor.sleeping) actor.bubble.setText(z);
  }

  /**
   * Occasionally (G3) send one lounging agent for a swim: it leaves its lounger,
   * paddles a couple of lanes in the pool, then climbs back out. Not every agent,
   * not constantly — driven off a periodic timer with a coin-flip.
   */
  private maybeSwim() {
    if (!this.alive) return;
    const loungers = [...this.actors.values()].filter(
      (a) => a.kind === 'lounge' && a.sleeping && !a.walking && !a.swimming,
    );
    if (loungers.length === 0) return;
    // ~50% of ticks, and a random lounger — keeps it an occasional flourish.
    if ((this.zzzPhase + loungers.length) % 2 === 0) return;
    const actor = loungers[(this.zzzPhase * 7 + loungers.length) % loungers.length]!;
    this.swimActor(actor);
  }

  /**
   * Gentle idle wander (C3): occasionally a lounging (sleeping) agent gets up,
   * walks to a nearby walkable tile in the pool zone, pauses, then returns to its
   * lounger. ~1-in-3 ticks fire; a different agent is picked than maybeSwim uses.
   */
  private maybeWander() {
    if (!this.alive) return;
    const candidates = [...this.actors.values()].filter(
      (a) => a.kind === 'lounge' && a.sleeping && !a.walking && !a.swimming,
    );
    if (candidates.length === 0) return;
    // ~1-in-3 ticks, different phase offset from maybeSwim to avoid synchronisation.
    if ((this.zzzPhase * 3 + candidates.length) % 3 !== 1) return;
    const actor = candidates[(this.zzzPhase * 11 + candidates.length * 7) % candidates.length]!;

    const seatX = actor.tx;
    const seatY = actor.ty;
    const seat = this.tileOf(seatX, seatY);

    // Try offsets around the seat until we land on a walkable tile.
    const offsets: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, 1], [1, -1], [-2, 1], [1, 2]];
    let wanderTile: { x: number; y: number } | null = null;
    for (const [dx, dy] of offsets) {
      const t = { x: seat.x + dx, y: seat.y + dy };
      if (t.x > 0 && t.y > 0 && t.x < COLS - 1 && t.y < ROWS - 1 && !this.blocked[t.y]?.[t.x]) {
        wanderTile = t;
        break;
      }
    }
    if (!wanderTile) return;

    actor.sleeping = false;
    actor.bubble.setText('');
    this.walkActor(actor, center(wanderTile.x), center(wanderTile.y));

    // After a brief pause at the wander spot, walk home and restore sleeping state.
    this.time.delayedCall(3000, () => {
      if (!this.alive || actor.swimming) return;
      this.walkActor(actor, seatX, seatY);
      this.time.delayedCall(2000, () => {
        if (!this.alive || actor.swimming || actor.walking) return;
        actor.sleeping = true;
        actor.bubble.setColor(toHex(STATUS_TINT.idle)).setText('z'.repeat(this.zzzPhase + 1));
      });
    });
  }

  /** Tween an actor from its lounger through a couple of pool lanes and back. */
  private swimActor(actor: Actor) {
    actor.swimming = true;
    actor.sleeping = false;
    actor.bubble.setText('');
    actor.sprite.setDepth(5);

    const leftPx = center(POOL.x);
    const rightPx = center(POOL.x + POOL.w - 1);
    const topPx = center(POOL.y);
    const midPx = center(POOL.y + Math.floor(POOL.h / 2));
    const homeX = actor.sprite.x;
    const homeY = actor.sprite.y;
    const entryX = Phaser.Math.Clamp(homeX, leftPx, rightPx);

    actor.ripple = this.add.ellipse(entryX, topPx, 22, 10, 0x7fd6ea, 0.6).setDepth(4);

    const lane = (x: number, y: number) => ({
      x,
      y,
      duration: Math.max(220, (Math.hypot(x - entryX, y - topPx) / PLAYER_SPEED) * 1000),
      ease: 'Sine.InOut',
      onStart: () => this.faceActor(actor, { x, y }),
    });

    actor.tween?.stop();
    actor.tween = this.tweens.chain({
      targets: actor.sprite,
      tweens: [
        lane(entryX, midPx), // wade in
        lane(rightPx, midPx), // lane 1
        lane(leftPx, midPx), // lane 2
        lane(entryX, topPx), // back to the edge
        lane(homeX, homeY), // climb out onto the lounger
      ],
      onComplete: () => this.endSwim(actor),
    });
  }

  /** End a swim (reached the lounger, re-seated, or interrupted) — reset chrome. */
  private endSwim(actor: Actor) {
    actor.swimming = false;
    actor.ripple?.destroy();
    actor.ripple = undefined;
    actor.sprite.setDepth(4).anims.stop();
    actor.sprite.setTexture(charKey('robot', 'down', 0)).setFlipX(false);
  }

  private updateActorContent(actor: Actor, agent: OfficeAgent) {
    actor.nameText.setText(this.truncate(agent.name));
    const tint = STATUS_TINT[agent.status];
    actor.statusText.setText(STATUS_LABEL[agent.status]).setColor(toHex(tint));

    // C1: show the live tool label when present and not idle; fall back to the
    // status glyph so the bubble always has something meaningful.
    const livLabel = agent.liveActivity?.label;
    const bubbleText =
      livLabel && agent.status !== 'idle' ? this.truncate(livLabel, 18) : STATUS_BUBBLE[agent.status];
    actor.bubble.setText(bubbleText).setColor(toHex(tint));

    // C2: per-tool shadow glow — shadow colour shifts to the active tool's
    // category so a glance at the floor shows what each agent is doing.
    const glow = toolShadowTint(agent.liveActivity?.phase === 'running' ? agent.liveActivity.tool : undefined);
    actor.shadow.setFillStyle(glow.color, glow.alpha);

    // B1: provider badge — dot color follows the agent CLI (claude/gemini/codex/…).
    const badgeColor = CLI_BADGE_COLOR[agent.agentCli ?? ''] ?? CLI_BADGE_DEFAULT;
    actor.providerBadge.setFillStyle(badgeColor, 0.9);

    // D1: start/stop the attention pulse tween depending on whether the agent
    // is waiting on the user. The tween loops indefinitely until cleared.
    if (agent.attention) {
      this.applyAttention(actor);
    } else {
      this.clearAttention(actor);
    }
  }

  /** Pulse the sprite scale 1.0→1.18→1.0 + orange tint when an agent needs you. */
  private applyAttention(actor: Actor) {
    if (actor.attentionTween?.isPlaying()) return; // already pulsing
    actor.attentionTween?.stop();
    actor.sprite.setTint(0xff6b35); // vivid orange — unmistakable
    actor.attentionTween = this.tweens.add({
      targets: actor.sprite,
      scaleX: { from: CHAR_SCALE, to: CHAR_SCALE * 1.18 },
      scaleY: { from: CHAR_SCALE, to: CHAR_SCALE * 1.18 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Restore normal tint + scale; stop the pulse tween. */
  private clearAttention(actor: Actor) {
    if (!actor.attentionTween) return;
    actor.attentionTween.stop();
    actor.attentionTween = undefined;
    actor.sprite.setScale(CHAR_SCALE).setTint(agentTint(actor.id));
  }

  /**
   * Walk an actor to a new seat (e.g. lounge → desk when it starts working),
   * routing around walls + furniture via A* and tweening through the waypoints.
   * Falls back to a direct tween if no grid path is found.
   */
  private walkActor(actor: Actor, tx: number, ty: number) {
    if (actor.swimming) this.endSwim(actor); // interrupt a swim if it's re-seated
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
      actor.sprite.setTexture(charKey('robot', 'down', 0, actor.variant)).setFlipX(false);
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
    actor.sprite.play(walkAnim('robot', dir, actor.variant), true);
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
    actor.providerBadge.setPosition(x + 8, y - 10);
  }

  private destroyActor(actor: Actor) {
    actor.tween?.stop();
    actor.attentionTween?.stop();
    actor.ripple?.destroy();
    actor.sprite.destroy();
    actor.shadow.destroy();
    actor.bubble.destroy();
    actor.nameText.destroy();
    actor.statusText.destroy();
    actor.providerBadge.destroy();
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
    this.player.anims.play(this.playerWalkAnim(this.facing), true);
  }

  private idlePlayer() {
    this.player.anims.stop();
    this.player.setTexture(this.playerCharKey(this.facing, 0));
  }

  private playerKindAndVariant(): { kind: CharKind; v: number } {
    const pv = useOfficeStore.getState().playerVariant;
    return pv < 0 ? { kind: 'human', v: 0 } : { kind: 'robot', v: pv };
  }

  private playerCharKey(dir: 'down' | 'up' | 'side', frame: 0 | 1): string {
    const { kind, v } = this.playerKindAndVariant();
    return charKey(kind, dir, frame, v);
  }

  private playerWalkAnim(dir: 'down' | 'up' | 'side'): string {
    const { kind, v } = this.playerKindAndVariant();
    return walkAnim(kind, dir, v);
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
    if (this.nearLibraryFlag) {
      useOfficeStore.getState().openLibrary();
      return;
    }
    if (this.nearPlaystationFlag) {
      useOfficeStore.getState().openPlaystation();
      return;
    }
    if (this.nearDoorFlag) {
      useOfficeStore.getState().setNearDoor(false);
      useOfficeStore.getState().setCurrentScene('corner');
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('corner-office'));
      return;
    }
    if (this.lastNearby) useOfficeStore.getState().open(this.lastNearby);
  }

  private body() {
    return this.player.body as Phaser.Physics.Arcade.Body;
  }

  private truncate(name: string, max = 10) {
    return name.length > max ? `${name.slice(0, max - 1)}…` : name;
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

  /**
   * Day/night floor wash (B2): a single world-spanning translucent rectangle over
   * the ground (floor, room accents, rugs, pool) but **below** furniture +
   * characters (depth −4), tinting the floor for the time of day. The colour/alpha
   * come from the time-of-day helper (aligned with the `time` theme's day window)
   * and are refreshed on a timer + on theme flip — see `refreshDayNight`.
   */
  private buildDayNight(worldW: number, worldH: number) {
    const tint = dayNightTint(new Date().getHours());
    this.dayNight = this.add
      .rectangle(0, 0, worldW, worldH, tint.color, tint.alpha)
      .setOrigin(0, 0)
      .setDepth(-4);
  }

  /** Re-read the clock and re-tint the day/night floor wash (timer + theme flip). */
  private refreshDayNight() {
    if (!this.alive) return;
    const tint = dayNightTint(new Date().getHours());
    this.dayNight.setFillStyle(tint.color, tint.alpha);
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
    // Clutter on the desk front, varied deterministically by seat index (E3).
    const clutter = [TEX.paperStack, TEX.deskMug, TEX.deskPlantlet];
    getDeskSeats().forEach(({ x, y }, i) => {
      const cx = center(x);
      const cy = center(y);
      this.add.image(cx, cy + TILE * 0.25, TEX.chair).setDepth(2);
      const desk = this.physics.add.staticImage(cx, cy + TILE * 0.3, TEX.desk).setDepth(6);
      this.solids.push(desk);
      this.add.image(cx, cy + TILE * 0.18, TEX.monitor).setDepth(7);
      // A couple of items flanking the monitor on the desk's front edge.
      const surfaceY = cy + TILE * 0.42;
      this.add.image(cx - 15, surfaceY, clutter[i % clutter.length]!).setDepth(8);
      this.add.image(cx + 15, surfaceY, clutter[(i + 1) % clutter.length]!).setDepth(8);
    });
  }

  /**
   * Agent pool (Phase 9 G): a tiled pool basin with a coping edge + a scrolled
   * water TileSprite (G2), and sun loungers along the deck where idle agents lie
   * (G3). The basin is non-walkable (blockedGrid) so the player + walking agents
   * route around it; swimmers tween through it.
   */
  private buildPool() {
    const cx = (POOL.x + POOL.w / 2) * TILE;
    const cy = (POOL.y + POOL.h / 2) * TILE;
    // Coping edge (a stone border a touch larger than the basin).
    this.add.rectangle(cx, cy, POOL.w * TILE + 10, POOL.h * TILE + 10, 0x9aa7b4).setDepth(-7);
    this.water = this.add
      .tileSprite(cx, cy, POOL.w * TILE, POOL.h * TILE, TEX.water)
      .setDepth(-6);
    // The player collides with the basin (can't walk on water); swimmers tween through it.
    this.physics.add.existing(this.water, true);
    this.solids.push(this.water);
    for (const s of LOUNGE_SEATS) this.add.image(center(s.x), center(s.y) + 2, TEX.lounger).setDepth(2);
  }

  /** Communal area (E3): a coffee corner (top-left), a TV/PS5 gaming lounge with an
   *  L of couches on an astro-turf patch (top-right), and pool + ping-pong tables
   *  along the bottom. The coffee machine is the only interactable. */
  private buildKitchen() {
    // Astro-turf floor of the top-right gaming corner.
    const turfCx = (ASTRO_TURF.x + ASTRO_TURF.w / 2) * TILE;
    const turfCy = (ASTRO_TURF.y + ASTRO_TURF.h / 2) * TILE;
    this.add.tileSprite(turfCx, turfCy, ASTRO_TURF.w * TILE, ASTRO_TURF.h * TILE, TEX.astroTurf).setDepth(-6);

    // Coffee corner (top-left) — machine is the interactable; counter + stool decor.
    this.add.image(center(COUNTER_POS.x), center(COUNTER_POS.y), TEX.counter).setDepth(2);
    this.add.image(center(STOOL_POS.x), center(STOOL_POS.y), TEX.stool).setDepth(3);
    const machine = this.add.image(center(COFFEE_POS.x), center(COFFEE_POS.y), TEX.coffee).setDepth(3);
    this.kitchenCenter = { x: machine.x, y: machine.y };

    // Gaming lounge (top-right): super-sized TV + white PS5, an L of couches + an
    // armchair facing it, and a low table holding four controllers. Couches are
    // collidable; the L's left arm is rotated upright (its `angle`).
    this.solids.push(this.staticDecor(TV_POS, TEX.tv, 5));
    const console_ = this.add.image(center(CONSOLE_POS.x), center(CONSOLE_POS.y), TEX.console).setDepth(5);
    // The console is the interactable anchor — player walks up + E opens the retro-games menu.
    this.playstationCenter = { x: console_.x, y: console_.y + TILE };
    for (const c of COUCHES) {
      const couch = this.staticDecor(c, TEX.couch, 2);
      if (c.angle) couch.setAngle(c.angle).refreshBody();
      this.solids.push(couch);
    }
    for (const a of ARMCHAIRS) this.solids.push(this.staticDecor(a, TEX.armchair, 2));
    this.buildGameTable();

    // Games tables along the bottom: pool (bottom-right) + ping-pong (centre).
    this.solids.push(this.tableDecor(POOL_TABLE, TEX.poolTable));
    this.solids.push(this.tableDecor(PING_PONG, TEX.pingPong));
  }

  /** The low gaming table + four controllers laid out 2×2 on its top (E3). */
  private buildGameTable() {
    const cx = center(GAME_TABLE_POS.x);
    const cy = center(GAME_TABLE_POS.y);
    this.solids.push(this.physics.add.staticImage(cx, cy, TEX.gameTable).setDepth(2));
    const spots: [number, number][] = [
      [-7, -3],
      [7, -3],
      [-7, 4],
      [7, 4],
    ];
    for (const [dx, dy] of spots) this.add.image(cx + dx, cy + dy, TEX.controller).setDepth(3);
  }

  /** A collidable furniture image centred on a multi-tile rect (pool/ping-pong). */
  private tableDecor(rect: { x: number; y: number; w: number; h: number }, key: string) {
    const cx = (rect.x + rect.w / 2) * TILE;
    const cy = (rect.y + rect.h / 2) * TILE;
    return this.physics.add.staticImage(cx, cy, key).setDepth(2);
  }

  private buildBoardroom() {
    for (const c of TABLE_CHAIRS) this.add.image(center(c.x), center(c.y), TEX.chair).setDepth(1);
    this.solids.push(this.staticDecor(TABLE_POS, TEX.table, 2));
    const board = this.add.image(center(BOARD_POS.x), center(BOARD_POS.y), TEX.board).setDepth(6);
    this.boardCenter = { x: board.x, y: board.y + TILE };
  }

  /** Library: bookshelves lining the walls + a reading chair. The bookshelf at
   *  BOOKSHELF_POS is the interactable — walk up + E opens the library modal (C). */
  private buildLibrary() {
    for (const s of BOOKSHELVES) this.add.image(center(s.x), center(s.y), TEX.bookshelf).setDepth(3);
    this.add.image(center(READING_CHAIR.x), center(READING_CHAIR.y), TEX.armchair).setDepth(2);
    // Anchor proximity just below the shelf so the player reaches it from the floor.
    this.libraryCenter = { x: center(BOOKSHELF_POS.x), y: center(BOOKSHELF_POS.y) + TILE };
  }

  /** Corner office: a door + welcome mat the player will step through (Phase 9 F). */
  private buildCornerOffice() {
    this.add
      .rectangle(center(DOOR_POS.x), center(DOOR_POS.y) + TILE * 0.4, TILE * 0.9, TILE * 0.35, 0x6ee7b7, 0.25)
      .setDepth(1); // welcome mat
    const door = this.add.image(center(DOOR_POS.x), center(DOOR_POS.y), TEX.door).setDepth(5);
    // Proximity anchor one tile above the door (player approaches from the north).
    this.doorCenter = { x: door.x, y: door.y - TILE };
  }

  /** Greenery (B2): several plants per room, varied by species/size + poolside palms. */
  private buildPlants() {
    for (const p of PLANTS) {
      // Anchor at the base so taller variants (palm) grow upward, not centred.
      this.add.image(center(p.x), center(p.y), plantTexture(p.variant)).setOrigin(0.5, 0.7).setDepth(3);
    }
  }

  /** Framed wall art (B2): pictures on the top walls, behind/below the name plates. */
  private buildWallArt() {
    for (const a of WALL_ART) this.add.image(center(a.x), center(a.y), TEX.wallArt).setDepth(4);
  }

  /** Area rugs (B2): drawn just above the floor accent, under the furniture. */
  private buildRugs() {
    for (const r of RUGS) this.add.image(center(r.x), center(r.y), TEX.rug).setDepth(-5);
  }

  /**
   * One **wall-mounted name plate** per room (Phase 9 A3): the room label on its
   * own rounded sign board, anchored on the room's top wall — so each room is
   * unmistakable at a glance, instead of a translucent label floating over the
   * floor. The plate fill is theme-driven (redrawn on flip in `applyPalette`); the
   * border + text use the room's fixed accent. See `roomSignStyle`.
   */
  private buildLabels() {
    const padX = 6;
    const padY = 3;
    for (const room of ROOMS) {
      const style = roomSignStyle(room.id, this.palette);
      const label = this.add
        .text(center(room.lx), center(room.ly), room.label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: toHex(style.text),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(12);
      const rect = new Phaser.Geom.Rectangle(
        label.x - label.width / 2 - padX,
        label.y - label.height / 2 - padY,
        label.width + padX * 2,
        label.height + padY * 2,
      );
      const plate = this.add.graphics().setDepth(11);
      this.roomSigns.push({ plate, id: room.id, rect });
      this.drawSignPlate(plate, room.id, rect);
    }
  }

  /** Draw (or redraw) a room sign's rounded plate with the current theme fill. */
  private drawSignPlate(plate: Phaser.GameObjects.Graphics, id: RoomId, rect: Phaser.Geom.Rectangle) {
    const style = roomSignStyle(id, this.palette);
    const radius = 5;
    plate
      .clear()
      .fillStyle(style.fill, 0.92)
      .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius)
      .lineStyle(1.5, style.border, 0.9)
      .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
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
      .sprite(sx, sy, this.playerCharKey('down', 0))
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
    // Viewport size at the current zoom level — vignette is pinned to the camera
    // (scrollFactor 0) so it always covers the visible area regardless of scroll.
    const viewW = Math.round(worldW / ZOOM);
    const viewH = Math.round(worldH / ZOOM);
    const key = 'office-vignette';
    if (!this.textures.exists(key)) {
      const canvas = this.textures.createCanvas(key, viewW, viewH);
      const ctx = canvas?.getContext();
      if (ctx) {
        const grd = ctx.createRadialGradient(
          viewW / 2,
          viewH / 2,
          Math.min(viewW, viewH) * 0.28,
          viewW / 2,
          viewH / 2,
          Math.max(viewW, viewH) * 0.62,
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, viewW, viewH);
        canvas?.refresh();
      }
    }
    this.add.image(viewW / 2, viewH / 2, key).setDepth(40).setScrollFactor(0);
  }
}

/** Build a Phaser game mounted into `parent`. Caller owns destroy(). */
export function createOfficeGame(parent: HTMLElement): Phaser.Game {
  // Import CornerOfficeScene here to avoid a circular module reference (both
  // scenes share the office-store but office-scene is the main entry point).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CornerOfficeScene } = require('./corner-office-scene') as typeof import('./corner-office-scene');
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: COLS * TILE,
    height: ROWS * TILE,
    backgroundColor: '#0b0b12',
    pixelArt: true, // nearest-neighbour scaling — keeps tiles/sprites crisp
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [OfficeScene, CornerOfficeScene],
  });
}

/** Re-read the app theme tokens and re-tint the running office scene. */
export function applyOfficeTheme(game: Phaser.Game): void {
  const scene = game.scene.getScene('office') as OfficeScene | null;
  scene?.applyPalette(buildOfficePalette());
}
