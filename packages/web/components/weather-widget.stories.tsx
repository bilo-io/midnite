import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { WeatherResponse } from '@midnite/shared';
import { expect, fn, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { WeatherWidget } from './weather-widget';

const WEATHER: WeatherResponse = {
  current: { temperatureC: 18, weatherCode: 2, precipitation: 0 },
  today: { highC: 22, lowC: 15, precipitationProbability: 10, weatherCode: 2 },
  resolvedAt: '2026-06-21T09:00:00.000Z',
};

// A saved location skips the browser-geolocation prompt, so the widget fetches
// straight away in the story.
const meta = {
  title: 'Widgets/WeatherWidget',
  component: WeatherWidget,
  args: {
    config: { units: 'c', location: { lat: 51.5, lon: -0.12, label: 'London' } },
    onConfigChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-72 w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeatherWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Current conditions for a saved location. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/weather', json: WEATHER }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Partly cloudy')).toBeInTheDocument();
    await expect(canvas.getByText('18°C')).toBeInTheDocument();
  },
};

/** Fahrenheit toggle reflows the readout. */
export const Fahrenheit: Story = {
  args: {
    config: { units: 'f', location: { lat: 51.5, lon: -0.12, label: 'London' } },
    onConfigChange: fn(),
  },
  beforeEach: () => installMockFetch([{ match: '/weather', json: WEATHER }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('64°F')).toBeInTheDocument();
  },
};

/** Upstream weather proxy fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/weather', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load weather.')).toBeInTheDocument();
  },
};

/**
 * Replace `navigator.geolocation` with one that always fails, the way the
 * packaged desktop app behaves (Electron ships no geolocation API key). Returns
 * a teardown so a story can't leak the stub into its neighbours.
 */
function stubFailingGeolocation(code: number): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: (_ok: unknown, fail: (e: { code: number }) => void) => fail({ code }) },
    configurable: true,
  });
  return () => {
    if (original) Object.defineProperty(navigator, 'geolocation', original);
  };
}

const NO_LOCATION = { units: 'c', location: null } as const;

/**
 * The reported case (bilo-io/midnite-app#2): the browser can't give coordinates,
 * so the widget resolves a coarse location from the caller's IP and shows real
 * weather — no input from the user at all.
 */
export const IpFallback: Story = {
  args: { config: { ...NO_LOCATION }, onConfigChange: fn() },
  beforeEach: () => {
    const restoreGeo = stubFailingGeolocation(2 /* POSITION_UNAVAILABLE */);
    const restoreFetch = installMockFetch([
      { match: '/weather/locate', json: { lat: 52.52, lon: 13.405, label: 'Berlin, Germany' } },
      { match: '/weather', json: WEATHER },
    ]);
    return () => {
      restoreFetch();
      restoreGeo();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('18°C')).toBeInTheDocument();
  },
};

/** Both automatic paths are out — a place search, not a latitude/longitude form. */
export const PlaceSearch: Story = {
  args: { config: { ...NO_LOCATION }, onConfigChange: fn() },
  beforeEach: () => {
    const restoreGeo = stubFailingGeolocation(1 /* PERMISSION_DENIED */);
    const restoreFetch = installMockFetch([
      { match: '/weather/locate', status: 500 },
      { match: '/weather', json: WEATHER },
    ]);
    return () => {
      restoreFetch();
      restoreGeo();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('searchbox')).toBeInTheDocument();
    await expect(canvas.getByText(/permission denied/i)).toBeInTheDocument();
  },
};
