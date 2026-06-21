// Registry of legal documents. The sidebar (app/legal/layout.tsx) and each route
// render from this list, so adding a doc is: add an entry here + a route segment
// under app/legal/<slug>/. Content is authored as markdown (rendered by <Markdown>).
//
// These are PLACEHOLDERS — drafting scaffolds, not legal advice. Replace with real,
// reviewed copy before launch (see todo Phase 11 Theme H, Decisions §6).

export type LegalDoc = {
  slug: string;
  title: string;
  /** Used for the page <title>/description metadata. */
  description: string;
  /** Markdown body. */
  content: string;
};

const PLACEHOLDER_NOTE =
  '> **Draft / placeholder — not legal advice.** This document is scaffolding only and does not reflect a reviewed, binding policy. Replace it with real, counsel-reviewed copy before launch.';

const LAST_UPDATED = 'Last updated: _pending_';

const privacy: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  description: 'How midnite handles your data.',
  content: `# Privacy Policy

${PLACEHOLDER_NOTE}

${LAST_UPDATED}

## Overview

midnite is a desktop application that orchestrates Claude Code agents on your own
machine. This placeholder describes the shape of a privacy policy; the real policy
will detail exactly what is and isn't collected.

## Information we collect

- **Account information** — placeholder for any identifiers required to use the app.
- **Usage data** — placeholder for diagnostics or telemetry, if any.
- **Content you provide** — tasks, prompts, and repository context you supply.

## How we use information

Placeholder. Describe the purposes for which any collected information is used —
operating the app, improving reliability, and providing support.

## Data storage & retention

Placeholder. midnite runs locally; describe what is stored on your machine versus
transmitted to any service, and for how long.

## Third-party services

Placeholder. List any third-party services involved (for example, the model
provider that powers the agents) and link to their policies.

## Your rights

Placeholder. Describe how to access, export, or delete your data.

## Contact

Placeholder. Provide a contact address for privacy questions.
`,
};

const eula: LegalDoc = {
  slug: 'eula',
  title: 'End-User License Agreement',
  description: 'The terms under which you may use midnite.',
  content: `# End-User License Agreement

${PLACEHOLDER_NOTE}

${LAST_UPDATED}

## 1. License grant

Placeholder. Describe the license granted to use the midnite desktop application,
including scope and any restrictions.

## 2. Restrictions

Placeholder. Describe what users may not do (for example, reverse engineering,
redistribution, or unlawful use).

## 3. Ownership

Placeholder. Clarify ownership of the software and any intellectual property.

## 4. Disclaimer of warranty

Placeholder. The software is provided "as is" without warranties of any kind, to the
extent permitted by law.

## 5. Limitation of liability

Placeholder. Describe the limits of liability associated with use of the software.

## 6. Termination

Placeholder. Describe the conditions under which this agreement may terminate.

## 7. Contact

Placeholder. Provide a contact address for licensing questions.
`,
};

export const LEGAL_DOCS: LegalDoc[] = [privacy, eula];

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => doc.slug === slug);
}
