import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

// Global so any feature that persists secrets (provider keys today, workflow
// credentials later) can inject the one CryptoService without re-importing.
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
