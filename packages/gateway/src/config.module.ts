import { Global, Module } from '@nestjs/common';
import { MIDNITE_CONFIG } from './config.token';
import { loadConfigFromDisk } from './lib/load-config';

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
