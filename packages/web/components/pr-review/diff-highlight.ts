'use client';

import { refractor } from 'refractor';
import tsx from 'refractor/lang/tsx.js';
import jsx from 'refractor/lang/jsx.js';
import { tokenize, type HunkData, type HunkTokens } from 'react-diff-view';

// refractor's "common" bundle already carries typescript/javascript/json/css/…
// but not the JSX/TSX supersets, which is most of what this repo's diffs are.
// Register them once at module load (idempotent; `register` no-ops on repeats).
refractor.register(tsx);
refractor.register(jsx);

// Map a file path to a Prism language id. Returns null when we have no highlighter
// for it — the caller then renders the file without syntax tokens (never an error).
const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
};

/** Prism language id for a path, or null when unsupported / registration missing. */
export function languageForPath(path: string): string | null {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const lang = EXTENSION_LANGUAGE[ext];
  return lang && refractor.registered(lang) ? lang : null;
}

/**
 * Syntax-highlight a file's hunks with refractor. Fail-soft: any tokenize error
 * (or an unsupported language) returns null so the diff still renders as plain text.
 */
export function tokenizeHunks(hunks: HunkData[], language: string | null): HunkTokens | null {
  if (!language) return null;
  try {
    return tokenize(hunks, { highlight: true, refractor, language });
  } catch {
    return null;
  }
}
