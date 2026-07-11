import { Inject, Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { MidniteConfig, VideoDeck } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import type { TtsResult } from './studio-tts.service';

const execFileAsync = promisify(execFile);

/** The rendered video + its container metadata. */
export interface VideoResult {
  video: Buffer;
  mimeType: string;
  ext: string;
}

/**
 * A pluggable video-generation seam (mirrors the Phase 17 spawner split). The
 * concrete generator this phase composes a narrated slideshow with `ffmpeg`; a
 * real generative-video provider can slot in behind the same interface later.
 */
export interface VideoGenerator {
  compose(deck: VideoDeck, narration: TtsResult): Promise<VideoResult>;
}

// Common font locations across macOS + Linux CI images. drawtext needs a real
// fontfile; when none is found we degrade rather than emit a fontless error.
const FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/TTF/DejaVuSans.ttf',
];

/**
 * Phase 65 E — composes a narrated slideshow into an MP4 with ffmpeg. Requires a
 * usable ffmpeg binary (config path or PATH), a narration audio track, and a
 * system font. When any is missing — or `memory.studio.video.mode: 'off'` — the
 * Studio service degrades to the slide outline + (if present) the audio track.
 * All failures resolve to a degraded artifact, never a hard error (Decision §1).
 */
@Injectable()
export class StudioVideoService {
  private readonly logger = new Logger(StudioVideoService.name);

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  /** Whether a composed video could be produced (mode on + ffmpeg + font found). */
  isEnabled(): boolean {
    if (this.config.memory.studio.video.mode === 'off') return false;
    return this.resolveFfmpeg() !== null && this.resolveFont() !== null;
  }

  /**
   * Compose the deck + narration into an MP4, or return null to degrade (ffmpeg
   * off/absent, no font, or a compose error). Slides are timed evenly across the
   * narration's duration so the audio and visuals end together.
   */
  async compose(deck: VideoDeck, narration: TtsResult | null): Promise<VideoResult | null> {
    const ffmpeg = this.resolveFfmpeg();
    const font = this.resolveFont();
    if (this.config.memory.studio.video.mode === 'off' || !ffmpeg || !font || !narration) {
      return null;
    }

    let dir: string | undefined;
    try {
      dir = await mkdtemp(join(tmpdir(), 'midnite-studio-'));
      const audioPath = join(dir, `narration.${narration.ext}`);
      await writeFile(audioPath, narration.audio);

      const totalSec = await this.probeDurationSec(ffmpeg, audioPath, deck.slides.length);
      const perSlide = Math.max(2, totalSec / deck.slides.length);

      // Write each slide's text to a file (relative to cwd=dir) so drawtext reads
      // it via `textfile=` — no shell escaping of the corpus text at all.
      const args: string[] = ['-y'];
      const filters: string[] = [];
      for (const [i, slide] of deck.slides.entries()) {
        await writeFile(join(dir, `h${i}.txt`), wrapText(slide.heading, 34));
        const body = slide.bullets.map((b) => `• ${b}`).join('\n');
        await writeFile(join(dir, `b${i}.txt`), wrapText(body, 52));
        args.push('-f', 'lavfi', '-i', `color=c=0x0b1220:s=1280x720:d=${perSlide.toFixed(2)}`);
        filters.push(
          `[${i}:v]` +
            drawtext(font, `h${i}.txt`, 52, 140, 'x=(w-text_w)/2') +
            ',' +
            drawtext(font, `b${i}.txt`, 34, 300, 'x=140') +
            `[v${i}]`,
        );
      }
      args.push('-i', audioPath);
      const audioIdx = deck.slides.length;
      const concatInputs = deck.slides.map((_, i) => `[v${i}]`).join('');
      const filterComplex =
        `${filters.join(';')};${concatInputs}concat=n=${deck.slides.length}:v=1:a=0[v]`;
      const outPath = join(dir, 'out.mp4');
      args.push(
        '-filter_complex',
        filterComplex,
        '-map',
        '[v]',
        '-map',
        `${audioIdx}:a`,
        '-shortest',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outPath,
      );

      await execFileAsync(ffmpeg, args, { cwd: dir, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
      const video = await readFile(outPath);
      return { video, mimeType: 'video/mp4', ext: 'mp4' };
    } catch (err) {
      this.logger.warn(`video compose failed, degrading to outline: ${String(err)}`);
      return null;
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** Best-effort audio duration via ffprobe; falls back to a per-slide default. */
  private async probeDurationSec(ffmpeg: string, audioPath: string, slides: number): Promise<number> {
    const ffprobe = ffmpeg.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
    try {
      const { stdout } = await execFileAsync(
        ffprobe,
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath],
        { timeout: 20_000 },
      );
      const secs = Number.parseFloat(stdout.trim());
      if (Number.isFinite(secs) && secs > 0) return secs;
    } catch {
      // ffprobe missing or failed — fall through to the default.
    }
    return slides * 6;
  }

  private resolveFfmpeg(): string | null {
    const configured = this.config.memory.studio.video.ffmpegPath;
    if (configured) return existsSync(configured) ? configured : null;
    // Trust a bare `ffmpeg` on PATH; execFile resolves it, and a compose failure
    // (binary truly absent) degrades gracefully anyway.
    return 'ffmpeg';
  }

  private resolveFont(): string | null {
    return FONT_CANDIDATES.find((f) => existsSync(f)) ?? null;
  }
}

/** Build a single drawtext filter clause reading its text from `textfile`. */
function drawtext(font: string, textfile: string, size: number, y: number, x: string): string {
  return (
    `drawtext=fontfile=${font}:textfile=${textfile}:fontcolor=white:fontsize=${size}:` +
    `line_spacing=12:${x}:y=${y}`
  );
}

/** Hard-wrap text to a column so long lines don't overflow the 1280px frame. */
export function wrapText(text: string, cols: number): string {
  return text
    .split('\n')
    .map((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      const out: string[] = [];
      let cur = '';
      for (const w of words) {
        if (cur.length + w.length + 1 > cols) {
          if (cur) out.push(cur);
          cur = w;
        } else {
          cur = cur ? `${cur} ${w}` : w;
        }
      }
      if (cur) out.push(cur);
      return out.join('\n');
    })
    .join('\n');
}
