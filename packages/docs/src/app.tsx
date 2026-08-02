import { MDXProvider } from '@mdx-js/react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ReadingLayoutProvider, type ReadingLinkProps } from '@midnite/ui';

import { DocPage } from './components/doc-page';
import { Layout } from './components/layout';
import { mdxComponents } from './components/mdx-components';
import { nav, routes } from './content/registry';

// Hash routing (Decision §1): the site is fully static with no server, so a hash
// router serves any deep link from index.html without host-side rewrite config —
// the safe default until the deploy target (deferred) is chosen. The route table
// and sidebar nav are both derived from the MDX content glob (see content/
// registry.ts), so adding a doc page = adding a file.

/**
 * Adapts react-router's `Link` to the shape the shared prose map expects. This is
 * what keeps root-relative links inside authored docs (`/app/tasks`) working: a
 * raw `<a href="/…">` would leave the hash router and ask the static host for a
 * path it can't serve.
 */
function RouterReadingLink({ href, className, children }: ReadingLinkProps) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

export function App() {
  return (
    // Both providers wrap the whole router so every render path — MDX pages,
    // imported product docs, the changelog — gets the same typography and the
    // same router-aware links.
    <ReadingLayoutProvider linkComponent={RouterReadingLink}>
      <MDXProvider components={mdxComponents}>
        <HashRouter>
          <Layout nav={nav}>
            <Routes>
              {routes.map((route) => (
                <Route key={route.path} path={route.path} element={<DocPage route={route} />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </MDXProvider>
    </ReadingLayoutProvider>
  );
}
