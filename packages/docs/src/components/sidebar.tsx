import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import { Collapse, cn } from '@midnite/ui';

import type { NavGroup } from '../content/nav';

// Grouped sidebar nav, driven by the content registry. Each section is a
// collapsible accordion: the header button toggles its `Collapse`-animated body
// (a CSS grid-rows transition, honouring prefers-reduced-motion), and the chevron
// rotates to match. Active-route highlighting comes from NavLink. All sections
// start open so the full map is visible; collapsing is opt-in per section.
export function Sidebar({ nav }: { nav: NavGroup[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav aria-label="Documentation" className="md:sticky md:top-20 md:self-start">
      <ul className="space-y-4">
        {nav.map((group) => {
          const open = !collapsed[group.section];
          const bodyId = `nav-section-${group.section.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <li key={group.section}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [group.section]: !prev[group.section] }))
                }
                className="mb-2 flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  aria-hidden
                  className={cn('h-3.5 w-3.5 shrink-0 transition-transform', !open && '-rotate-90')}
                />
                {group.section}
              </button>
              <Collapse open={open} id={bodyId} role="region" aria-label={group.section}>
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
              </Collapse>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
