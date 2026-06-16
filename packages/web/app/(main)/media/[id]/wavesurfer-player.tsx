'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

type Props = { src: string };

export function WaveSurferPlayer({ src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--muted-foreground) / 0.5)',
      progressColor: 'hsl(var(--foreground))',
      cursorColor: 'hsl(var(--primary))',
      height: 72,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url: src,
    });
    ws.on('ready', (dur) => {
      setDuration(dur);
      setReady(true);
    });
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));
    ws.on('timeupdate', (t) => setCurrentTime(t));
    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [src]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div ref={containerRef} className={ready ? '' : 'opacity-40'} />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={() => wsRef.current?.playPause()}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent disabled:opacity-40"
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </button>
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
