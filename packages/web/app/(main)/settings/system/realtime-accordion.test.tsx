import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const updateWsSettings = vi.fn();
vi.mock('@/lib/api', () => ({
  getWsSettings: vi.fn(),
  updateWsSettings: (...a: unknown[]) => updateWsSettings(...a),
}));

const useApiData = vi.fn();
vi.mock('@/lib/use-api-data', () => ({ useApiData: () => useApiData() }));

import { RealtimeAccordion } from './realtime-accordion';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  updateWsSettings.mockResolvedValue(1024);
  useApiData.mockReturnValue({ data: 512, refresh: vi.fn() });
});

it('shows the current buffer size selected', () => {
  render(<RealtimeAccordion />);
  fireEvent.click(screen.getByRole('button', { name: /Realtime/i }));
  expect(screen.getByLabelText('Event buffer size')).toHaveValue('512');
});

it('PATCHes the chosen size', async () => {
  render(<RealtimeAccordion />);
  fireEvent.click(screen.getByRole('button', { name: /Realtime/i }));
  fireEvent.change(screen.getByLabelText('Event buffer size'), { target: { value: '1024' } });
  await waitFor(() => expect(updateWsSettings).toHaveBeenCalledWith(1024));
});

it('surfaces an error when the update is refused (non-admin)', async () => {
  updateWsSettings.mockRejectedValue(new Error('Forbidden'));
  render(<RealtimeAccordion />);
  fireEvent.click(screen.getByRole('button', { name: /Realtime/i }));
  fireEvent.change(screen.getByLabelText('Event buffer size'), { target: { value: '256' } });
  expect(await screen.findByText('Forbidden')).toBeInTheDocument();
});
