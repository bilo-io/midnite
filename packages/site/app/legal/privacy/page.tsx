import type { Metadata } from 'next';

import { Markdown } from '@/components/markdown';
import { getLegalDoc } from '@/lib/legal';

const doc = getLegalDoc('privacy');

export const metadata: Metadata = doc
  ? { title: `${doc.title} — midnite`, description: doc.description }
  : {};

export default function PrivacyPage() {
  if (!doc) return null;
  return <Markdown content={doc.content} />;
}
