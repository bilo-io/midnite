import { SceneBackdrop } from '@/components/scene/scene-backdrop';
import { Nav } from '@/components/nav';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { Features } from '@/components/features';
import { CliShowcase } from '@/components/cli-showcase';
import { Download } from '@/components/download';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <>
      <SceneBackdrop />
      <Nav />
      <main className="relative">
        <Hero />
        <HowItWorks />
        <Features />
        <CliShowcase />
        <Download />
        <Footer />
      </main>
    </>
  );
}
