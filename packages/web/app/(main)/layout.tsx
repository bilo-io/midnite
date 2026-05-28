import type { ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
