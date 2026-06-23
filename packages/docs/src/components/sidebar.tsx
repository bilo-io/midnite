import { NavLink } from 'react-router-dom';

import { cn } from '@midnite/ui';

import type { NavGroup } from '../content/nav';

// Grouped sidebar nav, driven by the content registry. Active-route highlighting
// comes from NavLink. (A mobile drawer + on-page nav are Phase 26 Theme D; here
// it stacks above the content on small screens and pins as a column on md+.)
export function Sidebar({ nav }: { nav: NavGroup[] }) {
  return (
    <nav aria-label="Documentation" className="md:sticky md:top-20 md:self-start">
      <ul className="space-y-6">
        {nav.map((group) => (
          <li key={group.section}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.section}
            </h2>
            <ul className="space-y-0.5 border-l border-border">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      cn(
                        '-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:text-foreground',
                        isActive && 'border-foreground font-medium text-foreground',
                      )
                    }
                  >
                    {item.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
