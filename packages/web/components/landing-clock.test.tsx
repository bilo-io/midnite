import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LandingClock, LANDING_CLOCK_MODE_KEY } from './landing-clock';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// A fixed instant: Saturday, 18 July 2026, 09:05:07 local.
const NOW = new Date(2026, 6, 18, 9, 5, 7);

it('holds space but shows no clock before the client time resolves', () => {
  const { container } = render(<LandingClock now={null} />);
  expect(screen.queryByText(/09:05/)).toBeNull();
  // The placeholder is aria-hidden so it announces nothing.
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

it('renders a centred digital time + date by default', () => {
  render(<LandingClock now={NOW} />);
  expect(screen.getByText('09:05:07')).toBeInTheDocument();
  expect(screen.getByText(/Saturday, 18 July 2026/)).toBeInTheDocument();
});

it('cycles digital → analogue and persists the choice', async () => {
  render(<LandingClock now={NOW} />);

  const toggle = screen.getByRole('button', { name: /switch to analogue clock/i });
  fireEvent.click(toggle);

  // The analogue face replaces the digital readout.
  expect(screen.getByRole('img', { name: /analogue clock/i })).toBeInTheDocument();
  expect(screen.queryByText('09:05:07')).toBeNull();
  // Button now offers the reverse switch.
  expect(screen.getByRole('button', { name: /switch to digital clock/i })).toBeInTheDocument();

  await waitFor(() =>
    expect(localStorage.getItem(LANDING_CLOCK_MODE_KEY)).toBe(JSON.stringify('analogue')),
  );
});
