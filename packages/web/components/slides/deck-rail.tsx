'use client';

import React from 'react';
import type { Slide } from '@/lib/slides/markdown';

// A windowed, animated dot track. When there are more than THRESHOLD dots we
// show a fixed window of WINDOW dots kept centered on the active one; the whole
// strip slides under a clip and chevrons at each end report how many dots are
// hidden that way. The active dot is always centered so its attached content
// (the step sub-rail) never falls under the clip edge.
const WINDOW = 5;
const THRESHOLD = 10;

function Chevron({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) {
  const d = {
    up: 'M3 11l6-6 6 6',
    down: 'M3 7l6 6 6-6',
    left: 'M11 3l-6 6 6 6',
    right: 'M7 3l6 6-6 6',
  }[dir];
  return (
    <svg
      viewBox="0 0 18 18"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

type TrackProps = {
  orientation: 'vertical' | 'horizontal';
  count: number;
  active: number;
  size: number; // dot diameter (px)
  gap: number; // gap between dots (px)
  dotClass: (i: number) => string;
  label: (i: number) => string;
  onSelect: (i: number) => void;
  onPage: (dir: -1 | 1) => void;
  renderSide?: (i: number) => React.ReactNode;
  windowSize?: number;
  threshold?: number;
};

function DotTrack(p: TrackProps) {
  const { orientation, count, active, size, gap } = p;
  const vertical = orientation === 'vertical';
  const windowSize = p.windowSize ?? WINDOW;
  const threshold = p.threshold ?? THRESHOLD;
  const half = Math.floor(windowSize / 2);
  const windowed = count > threshold;
  const visible = windowed ? windowSize : count;
  const pitch = size + gap;

  // Keep the active dot centered in the window (no end-clamping) so its side
  // content stays put; empty slots at the ends are fine.
  const offset = windowed ? (active - half) * pitch : 0;
  const clipLen = visible * size + Math.max(0, visible - 1) * gap;
  const hiddenLeft = windowed ? Math.max(0, active - half) : 0;
  const hiddenRight = windowed ? Math.max(0, count - 1 - (active + half)) : 0;

  const dots = [];
  for (let i = 0; i < count; i++) {
    dots.push(
      <span className="dslot" key={i} style={{ width: size, height: size }}>
        <button
          type="button"
          className={`ddot ${p.dotClass(i)}`}
          style={{ width: size, height: size }}
          aria-label={p.label(i)}
          onClick={(e) => {
            e.stopPropagation();
            p.onSelect(i);
          }}
        />
        {p.renderSide?.(i)}
      </span>,
    );
  }

  return (
    <div className={`dtrack ${vertical ? 'v' : 'h'}${windowed ? ' windowed' : ''}`}>
      {windowed && (
        <button
          type="button"
          className="dchev"
          disabled={hiddenLeft === 0}
          aria-label={`${hiddenLeft} more before`}
          onClick={(e) => {
            e.stopPropagation();
            p.onPage(-1);
          }}
        >
          <Chevron dir={vertical ? 'up' : 'left'} />
          <span className="dcount">{hiddenLeft || ''}</span>
        </button>
      )}

      <span
        className="dclip"
        style={vertical ? { height: clipLen, width: size } : { width: clipLen, height: size }}
      >
        <span
          className="dinner"
          style={{ gap, transform: vertical ? `translateY(${-offset}px)` : `translateX(${-offset}px)` }}
        >
          {dots}
        </span>
      </span>

      {windowed && (
        <button
          type="button"
          className="dchev"
          disabled={hiddenRight === 0}
          aria-label={`${hiddenRight} more after`}
          onClick={(e) => {
            e.stopPropagation();
            p.onPage(1);
          }}
        >
          <span className="dcount">{hiddenRight || ''}</span>
          <Chevron dir={vertical ? 'down' : 'right'} />
        </button>
      )}
    </div>
  );
}

export function DeckRail({
  slides,
  index,
  reveal,
  jump,
}: {
  slides: Slide[];
  index: number;
  reveal: number;
  jump: (i: number, stepCount: number) => void;
}) {
  const steps = slides[index]?.steps.length ?? 0;
  const stepFocus = Math.max(0, reveal - 1);

  return (
    <nav className="rail" aria-label="Slide navigation" onClick={(e) => e.stopPropagation()}>
      <DotTrack
        orientation="vertical"
        count={slides.length}
        active={index}
        size={10}
        gap={16}
        dotClass={(i) => `sec${i === index ? ' active' : ''}${i < index ? ' seen' : ''}`}
        label={(i) => `Slide ${i + 1}: ${slides[i]?.title ?? ''}`}
        onSelect={(i) => jump(i, 0)}
        onPage={(dir) => jump(Math.max(0, Math.min(slides.length - 1, index + dir * WINDOW)), 0)}
        renderSide={(i) =>
          i === index && steps > 0 ? (
            <span className="subrail">
              <DotTrack
                orientation="horizontal"
                count={steps}
                active={stepFocus}
                size={6}
                gap={7}
                windowSize={7}
                threshold={7}
                dotClass={(j) => `sub${j < reveal ? ' filled' : ''}`}
                label={(j) => `Slide ${index + 1}, step ${j + 1}`}
                onSelect={(j) => jump(index, j + 1)}
                onPage={(dir) => jump(index, Math.max(0, Math.min(steps, reveal + dir * 7)))}
              />
            </span>
          ) : null
        }
      />
    </nav>
  );
}
