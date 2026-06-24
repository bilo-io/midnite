import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateTemplateRequestSchema,
  InstallTemplateRequestSchema,
  UpdateTemplateRequestSchema,
  WorkflowTemplateCategorySchema,
  type TemplateSlotsResponse,
  type WorkflowResponse,
  type WorkflowTemplateCategory,
  type WorkflowTemplateResponse,
  type WorkflowTemplatesResponse,
} from '@midnite/shared';
import {
  SystemTemplateDeleteError,
  TemplateNotFoundError,
  TemplateSlugTakenError,
  WorkflowTemplatesService,
} from './workflow-templates.service';

@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(
    @Inject(WorkflowTemplatesService)
    private readonly service: WorkflowTemplatesService,
  ) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('published') published?: string,
  ): WorkflowTemplatesResponse {
    const parsedCategory = WorkflowTemplateCategorySchema.safeParse(category);
    return {
      templates: this.service.listTemplates({
        category: parsedCategory.success ? (parsedCategory.data as WorkflowTemplateCategory) : undefined,
        published: published === 'true' ? true : published === 'false' ? false : undefined,
      }),
    };
  }

  @Post()
  create(@Body() body: unknown): WorkflowTemplateResponse {
    const parsed = CreateTemplateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return { template: this.service.createTemplate(parsed.data, 'system') };
    } catch (err) {
      if (err instanceof TemplateSlugTakenError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  @Get(':id')
  get(@Param('id') id: string): WorkflowTemplateResponse {
    try {
      return { template: this.service.getTemplate(id) };
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): WorkflowTemplateResponse {
    const parsed = UpdateTemplateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return { template: this.service.updateTemplate(id, parsed.data, 'system') };
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw new NotFoundException(err.message);
      if (err instanceof ForbiddenException) throw err;
      throw err;
    }
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    try {
      this.service.deleteTemplate(id, 'system');
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw new NotFoundException(err.message);
      if (err instanceof SystemTemplateDeleteError) throw new BadRequestException(err.message);
      if (err instanceof ForbiddenException) throw err;
      throw err;
    }
  }

  @Get(':id/slots')
  slots(@Param('id') id: string): TemplateSlotsResponse {
    try {
      return this.service.getSlots(id);
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Post(':id/install')
  install(@Param('id') id: string, @Body() body: unknown): WorkflowResponse {
    const parsed = InstallTemplateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return { workflow: this.service.install(id, parsed.data) };
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
