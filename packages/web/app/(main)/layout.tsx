import type { ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="pl-14">{children}</main>
    </div>
  );
}
