import { Global, Module } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from './config.token';

function loadConfigFromDisk(): MidniteConfig {
  const configPath = join(process.cwd(), 'midnite.json');
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return parseConfig(raw);
  } catch {
    return parseConfig({
      agent: {},
      terminal: {},
      knowledge: {},
      gateway: {},
    });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MIDNITE_CONFIG,
      useFactory: () => loadConfigFromDisk(),
    },
  ],
  exports: [MIDNITE_CONFIG],
})
export class ConfigModule {}
