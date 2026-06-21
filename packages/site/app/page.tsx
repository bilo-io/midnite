import { SceneBackdrop } from '@/components/scene/scene-backdrop';
import { Nav } from '@/components/nav';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { Features } from '@/components/features';
import { CliShowcase } from '@/components/cli-showcase';
import { Download } from '@/components/download';
import { Footer } from '@/components/footer';
import { SectionProvider } from '@/components/sections/section-controller';
import { PreviewPanel } from '@/components/panel/preview-panel';
import { PANEL_SECTION_IDS } from '@/components/panel/panel-sections';

export default function Home() {
  // The controller observes every panel-relevant section (hero → download). The
  // backdrop (recolour/per-section style), the persistent panel, and the typed
  // titles all subscribe to it, so it must wrap the whole tree — including the
  // backdrop, which reads the active section from outside the R3F canvas.
  return (
    <SectionProvider ids={PANEL_SECTION_IDS}>
      <SceneBackdrop />
      <Nav />
      <PreviewPanel />
      <main className="relative">
        <Hero />
        <HowItWorks />
        <Features />
        <CliShowcase />
        <Download />
        <Footer />
      </main>
    </SectionProvider>
  );
}
