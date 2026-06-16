'use client';

import type { MediaType } from '@midnite/shared';
import { useLocalStorage } from './use-local-storage';

export type ModelSelection = {
  provider: string;
  model: string;
};

export type MediaModelPrefs = Record<MediaType, ModelSelection>;

export type ProviderOption = {
  provider: string;
  label: string;
  models: { value: string; label: string }[];
};

export const MEDIA_PROVIDER_CATALOG: Record<MediaType, ProviderOption[]> = {
  image: [
    {
      provider: 'anthropic',
      label: 'Anthropic',
      models: [
        { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
        { value: 'claude-opus-4-8', label: 'Opus 4.8' },
        { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
        { value: 'claude-fable-5', label: 'Fable 5' },
      ],
    },
    {
      provider: 'openai',
      label: 'OpenAI',
      models: [
        { value: 'gpt-image-1', label: 'GPT Image 1' },
        { value: 'dall-e-3', label: 'DALL·E 3' },
        { value: 'dall-e-2', label: 'DALL·E 2' },
      ],
    },
    {
      provider: 'gemini',
      label: 'Google Gemini',
      models: [
        { value: 'imagen-4.0', label: 'Imagen 4' },
        { value: 'imagen-3.0', label: 'Imagen 3' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      ],
    },
    {
      provider: 'stability',
      label: 'Stability AI',
      models: [
        { value: 'stable-diffusion-3-5-large', label: 'SD 3.5 Large' },
        { value: 'stable-diffusion-3', label: 'SD 3' },
        { value: 'sdxl-1.0', label: 'SDXL 1.0' },
      ],
    },
    {
      provider: 'flux',
      label: 'Flux (Black Forest Labs)',
      models: [
        { value: 'flux-1.1-pro', label: 'Flux 1.1 Pro' },
        { value: 'flux-1-pro', label: 'Flux 1 Pro' },
        { value: 'flux-dev', label: 'Flux Dev' },
      ],
    },
  ],
  video: [
    {
      provider: 'runway',
      label: 'Runway',
      models: [
        { value: 'gen3a_turbo', label: 'Gen-3 Alpha Turbo' },
        { value: 'gen3a', label: 'Gen-3 Alpha' },
      ],
    },
    {
      provider: 'openai',
      label: 'OpenAI',
      models: [
        { value: 'sora-1-5', label: 'Sora 1.5' },
        { value: 'sora', label: 'Sora' },
      ],
    },
    {
      provider: 'gemini',
      label: 'Google Gemini',
      models: [
        { value: 'veo-3', label: 'Veo 3' },
        { value: 'veo-2', label: 'Veo 2' },
      ],
    },
    {
      provider: 'kling',
      label: 'Kling AI',
      models: [
        { value: 'kling-v2', label: 'Kling v2' },
        { value: 'kling-v1-5', label: 'Kling v1.5' },
        { value: 'kling-v1', label: 'Kling v1' },
      ],
    },
    {
      provider: 'luma',
      label: 'Luma AI',
      models: [
        { value: 'ray-2', label: 'Ray 2' },
        { value: 'dream-machine', label: 'Dream Machine' },
      ],
    },
    {
      provider: 'pika',
      label: 'Pika',
      models: [
        { value: 'pika-2.2', label: 'Pika 2.2' },
        { value: 'pika-2.0', label: 'Pika 2.0' },
      ],
    },
  ],
  audio: [
    {
      provider: 'anthropic',
      label: 'Anthropic',
      models: [
        { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
        { value: 'claude-opus-4-8', label: 'Opus 4.8' },
      ],
    },
    {
      provider: 'elevenlabs',
      label: 'ElevenLabs',
      models: [
        { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
        { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5' },
        { value: 'eleven_flash_v2_5', label: 'Flash v2.5' },
      ],
    },
    {
      provider: 'openai',
      label: 'OpenAI',
      models: [
        { value: 'tts-1-hd', label: 'TTS-1 HD' },
        { value: 'tts-1', label: 'TTS-1' },
      ],
    },
    {
      provider: 'suno',
      label: 'Suno',
      models: [
        { value: 'chirp-v4', label: 'Chirp v4' },
        { value: 'chirp-v3-5', label: 'Chirp v3.5' },
      ],
    },
    {
      provider: 'meta',
      label: 'Meta (AudioCraft)',
      models: [
        { value: 'musicgen-large', label: 'MusicGen Large' },
        { value: 'musicgen-medium', label: 'MusicGen Medium' },
        { value: 'audiogen-medium', label: 'AudioGen Medium' },
      ],
    },
  ],
};

export const DEFAULT_MEDIA_MODELS: MediaModelPrefs = {
  image: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  video: { provider: 'runway', model: 'gen3a_turbo' },
  audio: { provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
};

export function useMediaModels(): [
  MediaModelPrefs,
  (type: MediaType, selection: ModelSelection) => void,
] {
  const [prefs, setPrefs] = useLocalStorage<MediaModelPrefs>(
    'midnite.media.models',
    DEFAULT_MEDIA_MODELS,
  );
  const setSelection = (type: MediaType, selection: ModelSelection) =>
    setPrefs((prev) => ({ ...prev, [type]: selection }));
  return [prefs, setSelection];
}
