import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import {
  CreateProjectDocRequestSchema,
  UpdateProjectDocRequestSchema,
  type GenerateProjectDocResponse,
  type ProjectDocResponse,
  type ProjectDocsResponse,
} from '@midnite/shared';
import { ProjectDocsService } from './project-docs.service';

/** Thin CRUD + generate routes for a project's planning documents, nested
 *  under `/projects/:id/docs` (mirrors the milestones controller's shape). */
@Controller('projects/:id/docs')
export class ProjectDocsController {
  constructor(@Inject(ProjectDocsService) private readonly service: ProjectDocsService) {}

  @Get()
  list(@Param('id') projectId: string): ProjectDocsResponse {
    return { items: this.service.listDocs(projectId) };
  }

  @Post()
  create(@Param('id') projectId: string, @Body() body: unknown): ProjectDocResponse {
    const parsed = CreateProjectDocRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { doc: this.service.createDoc(projectId, parsed.data) };
  }

  @Patch(':docId')
  update(@Param('docId') docId: string, @Body() body: unknown): ProjectDocResponse {
    const parsed = UpdateProjectDocRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { doc: this.service.updateDoc(docId, parsed.data) };
  }

  @Delete(':docId')
  remove(@Param('docId') docId: string): { ok: true } {
    this.service.removeDoc(docId);
    return { ok: true };
  }

  @Post(':docId/generate')
  async generate(@Param('docId') docId: string): Promise<GenerateProjectDocResponse> {
    const doc = await this.service.generateDoc(docId);
    return { doc };
  }
}
