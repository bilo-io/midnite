import { Suspense, type ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';
import { PageReveal } from '@/components/page-reveal';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="transition-[padding] duration-200" style={{ paddingLeft: 'var(--nav-offset)' }}>
        {/* Pages read filters/ids from the query string via useSearchParams; under
            static export that needs a Suspense boundary above the page subtree. */}
        <Suspense fallback={null}>
          <PageReveal>{children}</PageReveal>
        </Suspense>
      </main>
    </div>
  );
}
