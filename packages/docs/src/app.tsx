import { MDXProvider } from '@mdx-js/react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { DocPage } from './components/doc-page';
import { Layout } from './components/layout';
import { mdxComponents } from './components/mdx-components';
import { nav, routes } from './content/registry';

// Hash routing (Decision §1): the site is fully static with no server, so a hash
// router serves any deep link from index.html without host-side rewrite config —
// the safe default until the deploy target (deferred) is chosen. The route table
// and sidebar nav are both derived from the MDX content glob (see content/
// registry.ts), so adding a doc page = adding a file.
export function App() {
  return (
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
  );
}
