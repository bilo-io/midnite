import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateNoteRequestSchema,
  UpdateNoteRequestSchema,
  type NotesResponse,
  type NoteResponse,
} from '@midnite/shared';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(@Inject(NotesService) private readonly service: NotesService) {}

  @Get()
  listNotes(): NotesResponse {
    return { notes: this.service.listNotes() };
  }

  @Post()
  createNote(@Body() body: unknown): NoteResponse {
    const parsed = CreateNoteRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { note: this.service.createNote(parsed.data) };
  }

  @Patch(':id')
  updateNote(@Param('id') id: string, @Body() body: unknown): NoteResponse {
    const parsed = UpdateNoteRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { note: this.service.updateNote(id, parsed.data) };
  }

  @Delete(':id')
  removeNote(@Param('id') id: string): { ok: true } {
    this.service.removeNote(id);
    return { ok: true };
  }
}
