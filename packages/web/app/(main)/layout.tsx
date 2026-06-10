import type { ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';
import { PageReveal } from '@/components/page-reveal';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="pl-14">
        <PageReveal>{children}</PageReveal>
      </main>
    </div>
  );
}
