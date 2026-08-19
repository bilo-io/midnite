import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { Project } from '@midnite/shared';

const buildProject = vi.fn();
const previewProject = vi.fn();
vi.mock('@/lib/api', () => ({
  buildProject: (...args: unknown[]) => buildProject(...args),
  previewProject: (...args: unknown[]) => previewProject(...args),
}));

// The terminal modal drags in xterm.js — stub it to a marker so the test can
// assert it opened without a real PTY attach.
vi.mock('@/components/run-command-modal', () => ({
  RunCommandModal: ({ title }: { title: string }) => <div role="dialog">{title}</div>,
}));

import { ProjectRunActions } from './project-run-actions';
import { ToastProvider } from '@/components/toast';
import { SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import { withLocale } from '@/lib/test-locale-wrapper';

const render = (ui: ReactElement) => rtlRender(withLocale(<ToastProvider>{ui}</ToastProvider>));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  vi.clearAllMocks();
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Atlas',
    tag: 'ATLAS',
    color: '#7c3aed',
    workDir: '~/dev/atlas',
    startCommand: 'pnpm dev',
    buildCommand: 'pnpm build',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProjectRunActions — visibility', () => {
  it('renders a build and a launch button when both commands are configured', () => {
    render(<ProjectRunActions project={makeProject()} />);
    expect(screen.getByRole('button', { name: /Build Atlas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch Atlas/ })).toBeInTheDocument();
  });

  it('renders only the button whose command is configured', () => {
    render(<ProjectRunActions project={makeProject({ buildCommand: undefined })} />);
    expect(screen.queryByRole('button', { name: /Build Atlas/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch Atlas/ })).toBeInTheDocument();
  });

  it('renders nothing without a work directory', () => {
    render(<ProjectRunActions project={makeProject({ workDir: undefined })} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ProjectRunActions — run modes', () => {
  it('opens the terminal modal by default (terminal mode)', async () => {
    render(<ProjectRunActions project={makeProject()} />);
    fireEvent.click(screen.getByRole('button', { name: /Launch Atlas/ }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    // The modal owns the API call via its start() prop — nothing fired yet here.
    expect(previewProject).not.toHaveBeenCalled();
  });

  it('fires a background run without a modal when the setting says background', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ projectRunMode: 'background' }));
    previewProject.mockResolvedValue({ terminalId: 'project-run-1' });
    render(<ProjectRunActions project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: /Launch Atlas/ }));

    await waitFor(() =>
      expect(previewProject).toHaveBeenCalledWith('p1', { background: true }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('background build calls the build endpoint', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ projectRunMode: 'background' }));
    buildProject.mockResolvedValue({ terminalId: 'project-run-2' });
    render(<ProjectRunActions project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: /Build Atlas/ }));

    await waitFor(() => expect(buildProject).toHaveBeenCalledWith('p1', { background: true }));
  });
});
