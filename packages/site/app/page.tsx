import { AmbientBackdrop } from '@/components/ambient-backdrop';
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
  // The controller observes every panel-relevant section (hero → download); the
  // persistent panel and the typed titles subscribe to it.
  return (
    <SectionProvider ids={PANEL_SECTION_IDS}>
      <AmbientBackdrop />
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
