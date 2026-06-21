'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { useActiveSection } from '@/components/sections/section-controller';
import { PANEL_CONTENT } from '@/components/panel-content/registry';
import { PanelFrame } from './panel-frame';
import { getPanelSection } from './panel-sections';
import { panelRectFor } from './panel-rect';

function useViewport() {
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return vp;
}

// The morphing fixed panel is a desktop affordance; mobile uses the inline panel.
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return desktop;
}

/**
 * The signature element (Theme C): ONE Mac-window panel, rendered once at the page
 * root, that travels and resizes between sections and cross-fades its content. The
 * scroll controller (useActiveSection) is the single source of truth; the panel
 * animates its rect to the active section's target and swaps the inner module. The
 * hero state is the default before any section is observed active. Under reduced
 * motion the morph + swap are instant.
 */
export function PreviewPanel() {
  const active = useActiveSection();
  const reduced = useReducedMotion();
  const vp = useViewport();
  const isDesktop = useIsDesktop();

  const section = getPanelSection(active) ?? getPanelSection('top');
  if (!isDesktop || !vp || !section) return null;

  const hidden = section.placement === 'hidden';
  const rect = panelRectFor(section.placement, vp.w, vp.h);
  const { title, Component } = PANEL_CONTENT[section.content];

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-20"
      initial={false}
      animate={{
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        opacity: hidden ? 0 : 1,
      }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 120, damping: 22, mass: 0.9, opacity: { duration: 0.4 } }
      }
    >
      <PanelFrame title={title}>
        <AnimatePresence mode="wait">
          <motion.div
            key={section.content}
            className="absolute inset-0"
            initial={reduced ? false : { opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
            transition={{ duration: reduced ? 0 : 0.32, ease: 'easeOut' }}
          >
            <Component />
          </motion.div>
        </AnimatePresence>
      </PanelFrame>
    </motion.div>
  );
}
