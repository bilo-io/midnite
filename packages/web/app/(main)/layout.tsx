import type { ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';
import { PageReveal } from '@/components/page-reveal';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="transition-[padding] duration-200" style={{ paddingLeft: 'var(--nav-offset)' }}>
        <PageReveal>{children}</PageReveal>
      </main>
    </div>
  );
}
