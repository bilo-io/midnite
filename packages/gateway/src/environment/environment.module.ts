import { Module } from '@nestjs/common';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';

// The system-toolchain checker (Homebrew, Node, proto, moon) for Settings →
// System. Detection reuses the agent CLI checker's login-shell probe; install/
// update/uninstall reuse the terminal module's ad-hoc PTY flow.
@Module({
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
})
export class EnvironmentModule {}
