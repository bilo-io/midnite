import type { Metadata } from 'next';

import { Markdown } from '@/components/markdown';
import { getLegalDoc } from '@/lib/legal';

const doc = getLegalDoc('eula');

export const metadata: Metadata = doc
  ? { title: `${doc.title} — midnite`, description: doc.description }
  : {};

export default function EulaPage() {
  if (!doc) return null;
  return <Markdown content={doc.content} />;
}
