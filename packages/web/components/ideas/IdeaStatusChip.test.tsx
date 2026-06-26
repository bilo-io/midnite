import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { IdeaStatusChip } from './IdeaStatusChip';

afterEach(cleanup);

describe('IdeaStatusChip', () => {
  it('renders Draft for draft status', () => {
    render(<IdeaStatusChip status="draft" />);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('renders Refined for refined status', () => {
    render(<IdeaStatusChip status="refined" />);
    expect(screen.getByText('Refined')).toBeTruthy();
  });

  it('renders Promoted for promoted status', () => {
    render(<IdeaStatusChip status="promoted" />);
    expect(screen.getByText('Promoted')).toBeTruthy();
  });
});
