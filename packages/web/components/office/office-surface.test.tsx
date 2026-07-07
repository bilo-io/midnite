import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OfficeSurface } from './office-surface';

// The two engines boot Phaser / three (WebGL) — stub them so this stays a pure
// jsdom test of the ?view= routing, not a renderer smoke (that's the Playwright
// flow in Theme A/G).
vi.mock('./office-view', () => ({ OfficeView: () => <div data-testid="office-2d" /> }));
vi.mock('@/components/office3d/office-3d-view', () => ({ Office3DView: () => <div data-testid="office-3d" /> }));

let searchValue: string | null = null;
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchValue ? `view=${searchValue}` : ''),
}));

afterEach(() => {
  searchValue = null;
});

describe('OfficeSurface', () => {
  it('renders the 2D office by default (no view param)', () => {
    searchValue = null;
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-2d')).toBeInTheDocument();
    expect(screen.queryByTestId('office-3d')).not.toBeInTheDocument();
  });

  it('opts into the 3D office when ?view=3d', () => {
    searchValue = '3d';
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-3d')).toBeInTheDocument();
    expect(screen.queryByTestId('office-2d')).not.toBeInTheDocument();
  });

  it('falls back to 2D for any other view value', () => {
    searchValue = '2d';
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-2d')).toBeInTheDocument();
  });
});
