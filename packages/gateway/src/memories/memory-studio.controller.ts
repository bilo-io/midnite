import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  GenerateMemoryArtifactRequestSchema,
  type MemoryArtifactResponse,
  type MemoryArtifactsResponse,
} from '@midnite/shared';
import { MemoryStudioService } from './memory-studio.service';

/**
 * Phase 65 D — Studio artifact endpoints, scoped under a memory. Thin: parse +
 * delegate to {@link MemoryStudioService}. Generation is async, so POST returns
 * the `pending` artifact and the client polls `GET …/artifacts`.
 */
@Controller('memories/:id/artifacts')
export class MemoryStudioController {
  constructor(@Inject(MemoryStudioService) private readonly service: MemoryStudioService) {}

  @Get()
  list(@Param('id') id: string): MemoryArtifactsResponse {
    return { artifacts: this.service.listArtifacts(id) };
  }

  @Post()
  generate(@Param('id') id: string, @Body() body: unknown): MemoryArtifactResponse {
    const parsed = GenerateMemoryArtifactRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { artifact: this.service.generate(id, parsed.data.kind) };
  }

  @Delete(':artifactId')
  remove(@Param('id') id: string, @Param('artifactId') artifactId: string): { ok: true } {
    this.service.deleteArtifact(id, artifactId);
    return { ok: true };
  }
}
