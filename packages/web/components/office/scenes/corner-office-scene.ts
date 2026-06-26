import Phaser from 'phaser';
import { useOfficeStore } from '@/lib/office-store';
import { OFFICE_TILE } from '@/lib/office/dimensions';
import { buildOfficePalette, type OfficePalette } from '@/lib/office/theme';
import { charKey, ensureOfficeAnims, ensureOfficeTextures, TEX, walkAnim, type CharKind } from '@/lib/office/textures';
import { deskItemById } from '@/lib/office/desk-items';

// Corner office: a small private room the player enters from the main floor
// (Phase 9 F). Layout is self-contained — no agents, just the player + their
// customisable desk + a laptop. The room is 14×10 tiles.

const TILE = OFFICE_TILE;
const COLS = 14;
const ROWS = 10;
const PLAYER_SPEED = 150;
const PROXIMITY = TILE * 1.8;

// Key positions (tile coords)
const PLAYER_SPAWN = { x: 2, y: 5 };
const EXIT_POS = { x: 0, y: 5 }; // left-wall door — pressing E exits back to the main office
const DESK_POS = { x: 9, y: 3 }; // desk tile (player interacts from below it)
const DESK_INTERACT_POS = { x: 9, y: 5 }; // where the player must stand to open the desk picker
const LAPTOP_POS = { x: 7, y: 3 }; // laptop tile (decorative)
/** Up to 3 slots across the front edge of the desk. */
const ITEM_SLOTS: { x: number; y: number }[] = [
  { x: 8, y: 3.6 },
  { x: 9, y: 3.6 },
  { x: 10, y: 3.6 },
];

const center = (tile: number) => tile * TILE + TILE / 2;
const toHex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class CornerOfficeScene extends Phaser.Scene {
  private palette!: OfficePalette;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly solids: Phaser.GameObjects.GameObject[] = [];
  private facing: 'down' | 'up' | 'side' = 'down';
  private inputEnabled = true;
  private alive = false;
  private unsub?: () => void;

  // Proximity centres (px) for the exit door and the desk.
  private exitCenter = { x: 0, y: 0 };
  private deskCenter = { x: 0, y: 0 };
  private nearExitFlag = false;
  private nearDeskFlag = false;

  // Laptop cursor blink tween.
  private cursorText?: Phaser.GameObjects.Text;
  /** Rendered item sprites (cleared + re-drawn when deskItems changes). */
  private itemSprites: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('corner-office');
  }

  preload() {
    const cfg = { frameWidth: 16, frameHeight: 32 };
    this.load.spritesheet('office-char-v0', '/office/char-v0.png', cfg);
    for (let i = 1; i <= 5; i++) {
      this.load.spritesheet(`office-char-v${i}`, `/office/char-v${i}.png`, cfg);
    }
  }

  create() {
    this.palette = buildOfficePalette();
    ensureOfficeTextures(this);
    ensureOfficeAnims(this);

    const worldW = COLS * TILE;
    const worldH = ROWS * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(this.palette.background);
    // Zoom the corner-office to fill the canvas, then centre the camera on the room.
    const zoom = Math.min(this.scale.width / worldW, this.scale.height / worldH);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(worldW / 2, worldH / 2);
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.buildRoom(worldW, worldH);
    this.buildDeskArea();
    this.buildPlants();
    this.buildPlayer();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as CornerOfficeScene['wasd'];
    this.input.keyboard!.on('keydown-E', this.tryInteract, this);
    this.input.keyboard!.on('keydown-ENTER', this.tryInteract, this);

    this.alive = true;

    useOfficeStore.getState().setCurrentScene('corner');

    // Subscribe to store changes: re-render items, freeze on picker open,
    // and exit back to the main office when the HUD's back button fires.
    this.unsub = useOfficeStore.subscribe((state, prev) => {
      if (!this.alive) return;
      if (state.deskItems !== prev.deskItems) this.renderDeskItems(state.deskItems);
      // Keyboard freeze while the desk or character picker is open.
      const frozen = state.deskPickerOpen || state.characterPickerOpen;
      const wasFrozen = prev.deskPickerOpen || prev.characterPickerOpen;
      if (frozen !== wasFrozen) {
        this.inputEnabled = !frozen;
        const kb = this.input.keyboard;
        if (kb) kb.enabled = !frozen;
      }
      // HUD "Back to Office" button sets currentScene to 'office' — honour it.
      if (state.currentScene === 'office' && prev.currentScene === 'corner') {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('office'));
      }
      if (state.playerVariant !== prev.playerVariant) {
        this.player.setTexture(this.playerCharKey(this.facing, 0));
      }
    });
    this.renderDeskItems(useOfficeStore.getState().deskItems);

    const teardown = () => {
      this.alive = false;
      this.unsub?.();
      this.unsub = undefined;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  override update() {
    if (!this.alive) return;
    this.movePlayer();
    this.playerShadow.setPosition(this.player.x, this.player.y + TILE * 0.42);

    const px = this.player.x;
    const py = this.player.y;

    // Exit-door proximity.
    const eDist = (px - this.exitCenter.x) ** 2 + (py - this.exitCenter.y) ** 2;
    const nearExit = eDist <= PROXIMITY ** 2;
    if (nearExit !== this.nearExitFlag) {
      this.nearExitFlag = nearExit;
      // The HUD reads currentScene === 'corner' to show the back button, but
      // the door prompt needs to know we're near it too — reuse nearDoor.
      useOfficeStore.getState().setNearDoor(nearExit);
    }

    // Desk proximity.
    const dDist = (px - this.deskCenter.x) ** 2 + (py - this.deskCenter.y) ** 2;
    const nearDesk = dDist <= PROXIMITY ** 2;
    if (nearDesk !== this.nearDeskFlag) {
      this.nearDeskFlag = nearDesk;
    }

    // Cursor blink driven by tween — nothing to poll.
  }

  /** Re-tint when app theme changes (called from OfficeGame). */
  applyPalette(palette: OfficePalette) {
    if (!this.alive) return;
    this.palette = palette;
    this.cameras.main.setBackgroundColor(palette.background);
  }

  // ---- interaction ----------------------------------------------------------

  private tryInteract() {
    if (!this.inputEnabled) return;
    if (this.nearExitFlag) {
      this.exitToOffice();
      return;
    }
    if (this.nearDeskFlag) {
      useOfficeStore.getState().openDeskPicker();
    }
  }

  private exitToOffice() {
    useOfficeStore.getState().setNearDoor(false);
    useOfficeStore.getState().setCurrentScene('office');
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('office'));
  }

  // ---- room construction ----------------------------------------------------

  private buildRoom(worldW: number, worldH: number) {
    // Floor.
    this.add.tileSprite(0, 0, worldW, worldH, TEX.floor).setOrigin(0, 0).setTint(this.palette.floor).setDepth(-10);

    // Warm floor accent for the private room feel.
    this.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, 0xd4a574, 0.08).setDepth(-9);

    // Walls — perimeter tiles.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const isWall =
          x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
        // Opening at the left wall: EXIT_POS ± 1 row — the doorway.
        const isDoor = x === 0 && (y === EXIT_POS.y - 1 || y === EXIT_POS.y || y === EXIT_POS.y + 1);
        if (isWall && !isDoor) {
          const wall = this.physics.add.staticImage(center(x), center(y), TEX.wall).setTint(this.palette.wall);
          this.solids.push(wall);
        }
      }
    }

    // Rug under the desk area.
    this.add.image(center(9), center(4.5), TEX.rug).setDepth(-5);

    // Exit door sprite + welcome mat (entering from the left).
    this.add
      .rectangle(center(EXIT_POS.x) + TILE * 0.4, center(EXIT_POS.y), TILE * 0.35, TILE * 0.9, 0x6ee7b7, 0.3)
      .setDepth(1);
    this.add.image(center(EXIT_POS.x), center(EXIT_POS.y), TEX.door).setDepth(5);
    this.exitCenter = { x: center(EXIT_POS.x) + TILE, y: center(EXIT_POS.y) };

    // Room label.
    this.add
      .text(center(7), TILE * 0.4, 'CORNER OFFICE', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: toHex(0xd4a574),
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.7)
      .setDepth(10);
  }

  private buildDeskArea() {
    // Chair behind the desk.
    this.add.image(center(DESK_POS.x), center(DESK_POS.y + 0.5), TEX.chair).setDepth(2);

    // The desk itself (collidable).
    const desk = this.physics.add.staticImage(center(DESK_POS.x), center(DESK_POS.y) + TILE * 0.3, TEX.desk).setDepth(6);
    this.solids.push(desk);

    // Monitor above the desk.
    this.add.image(center(DESK_POS.x), center(DESK_POS.y) + TILE * 0.18, TEX.monitor).setDepth(7);

    // Laptop (slightly left of the desk, smaller).
    const laptop = this.add.image(center(LAPTOP_POS.x), center(LAPTOP_POS.y) + TILE * 0.1, TEX.monitor).setDepth(7);
    laptop.setScale(0.6);
    this.buildLaptopCursor(laptop.x, laptop.y - 4);

    // Desk proximity anchor — where the player stands to interact.
    this.deskCenter = { x: center(DESK_INTERACT_POS.x), y: center(DESK_INTERACT_POS.y) };
  }

  /**
   * F3: A blinking cursor on the laptop screen — a simple text object that
   * toggles visibility every 550ms via a looping Phaser tween.
   */
  private buildLaptopCursor(x: number, y: number) {
    this.cursorText = this.add
      .text(x - 4, y, '▋', { fontFamily: 'monospace', fontSize: '8px', color: '#22c55e' })
      .setDepth(8);
    this.tweens.add({
      targets: this.cursorText,
      alpha: 0,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });
  }

  /** Render desk items from the store — called on create + whenever deskItems changes. */
  private renderDeskItems(itemIds: string[]) {
    for (const s of this.itemSprites) (s as Phaser.GameObjects.Text | Phaser.GameObjects.Graphics).destroy();
    this.itemSprites = [];

    const slots = ITEM_SLOTS.slice(0, 3);
    itemIds.slice(0, slots.length).forEach((id, i) => {
      const slot = slots[i];
      if (!slot) return;
      const item = deskItemById(id);
      if (!item) return;
      const sprite = this.renderItemSprite(id, center(slot.x), center(slot.y));
      if (sprite) this.itemSprites.push(sprite);
      const label = this.add
        .text(center(slot.x), center(slot.y) + 10, item.emoji, { fontFamily: 'monospace', fontSize: '12px' })
        .setOrigin(0.5)
        .setDepth(9);
      this.itemSprites.push(label);
    });
  }

  /** Draw a simple animated procedural sprite for a desk item. */
  private renderItemSprite(id: string, x: number, y: number): Phaser.GameObjects.Graphics | null {
    const g = this.add.graphics().setDepth(9);
    switch (id) {
      case 'lava-lamp': {
        // Base + tall body + blob.
        g.fillStyle(0x4f3f7a, 1).fillRoundedRect(x - 5, y - 1, 10, 4, 2);
        g.fillStyle(0x6a4aaa, 0.9).fillRoundedRect(x - 4, y - 13, 8, 12, 3);
        g.fillStyle(0xff7eb3, 0.85).fillEllipse(x, y - 9, 6, 5);
        // Floating blob animation.
        this.tweens.add({ targets: g, y: `+=${2}`, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        break;
      }
      case 'fidget-spinner': {
        // Three lobes around a hub.
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const cx = x + Math.cos(angle) * 6;
          const cy = y + Math.sin(angle) * 6;
          g.fillStyle(0x38bdf8, 0.9).fillCircle(cx, cy, 4);
        }
        g.fillStyle(0x0ea5e9, 1).fillCircle(x, y, 3);
        // Rotation tween.
        this.tweens.add({ targets: g, angle: 360, duration: 1200, repeat: -1, ease: 'Linear' });
        break;
      }
      case 'rubiks-cube': {
        // 3×3 grid of coloured squares.
        const colors = [0xff0000, 0xffa500, 0xffff00, 0x00aa00, 0x0000ff, 0xff69b4, 0xffffff, 0xff8c00, 0x00ffff];
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            g.fillStyle(colors[row * 3 + col] ?? 0xffffff, 1).fillRect(x - 7 + col * 5, y - 7 + row * 5, 4, 4);
          }
        }
        g.lineStyle(1, 0x000000, 0.4).strokeRect(x - 8, y - 8, 15, 15);
        break;
      }
      case 'photo-frame': {
        g.lineStyle(2, 0x9ca3af, 1).strokeRect(x - 7, y - 8, 14, 11);
        g.fillStyle(0x374151, 0.8).fillRect(x - 6, y - 7, 12, 9);
        // Silhouette of a person.
        g.fillStyle(0xfbbf24, 1).fillCircle(x, y - 4, 2.5);
        g.fillStyle(0xfbbf24, 0.7).fillTriangle(x - 3, y + 1, x + 3, y + 1, x, y - 2);
        break;
      }
      default:
        return null;
    }
    return g;
  }

  private buildPlants() {
    // A couple of plants in the corners for life.
    this.add.image(center(12), center(1.5), 'office-plant-palm').setOrigin(0.5, 0.7).setDepth(3);
    this.add.image(center(1.5), center(1.5), 'office-plant-leafy').setOrigin(0.5, 0.7).setDepth(3);
  }

  // ---- player movement (mirrors main scene) ---------------------------------

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

  private buildPlayer() {
    this.player = this.physics.add
      .sprite(center(PLAYER_SPAWN.x), center(PLAYER_SPAWN.y), this.playerCharKey('down', 0))
      .setScale(1.3)
      .setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);

    this.playerShadow = this.add
      .ellipse(this.player.x, this.player.y + TILE * 0.42, TILE * 0.6, TILE * 0.2, 0x000000, 0.2)
      .setDepth(9);
  }

  private movePlayer() {
    if (!this.inputEnabled) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.idlePlayer();
      return;
    }
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    let vx = 0;
    let vy = 0;
    if (left) { vx = -PLAYER_SPEED; this.facing = 'side'; }
    else if (right) { vx = PLAYER_SPEED; this.facing = 'side'; }
    if (up) { vy = -PLAYER_SPEED; if (!left && !right) this.facing = 'up'; }
    else if (down) { vy = PLAYER_SPEED; if (!left && !right) this.facing = 'down'; }

    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (vx < 0) this.player.setFlipX(true);
      else if (vx > 0) this.player.setFlipX(false);
      this.walkPlayer();
    } else {
      this.idlePlayer();
    }
  }

  private walkPlayer() {
    this.player.anims.play(this.playerWalkAnim(this.facing), true);
  }

  private idlePlayer() {
    this.player.anims.stop();
    this.player.setTexture(this.playerCharKey(this.facing, 0));
  }
}

/** Re-read the app theme tokens and re-tint the running corner-office scene. */
export function applyCornerOfficeTheme(game: Phaser.Game): void {
  const scene = game.scene.getScene('corner-office') as CornerOfficeScene | null;
  scene?.applyPalette(buildOfficePalette());
}
