import { Global, Module } from '@nestjs/common';
import { ServiceTokensController } from './service-tokens.controller';
import { ServiceTokensRepository } from './service-tokens.repository';
import { ServiceTokensService } from './service-tokens.service';

@Global()
@Module({
  providers: [ServiceTokensRepository, ServiceTokensService],
  controllers: [ServiceTokensController],
  exports: [ServiceTokensService],
})
export class ServiceTokensModule {}
