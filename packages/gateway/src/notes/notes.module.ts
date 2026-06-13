import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService, NotesRepository],
  exports: [NotesService],
})
export class NotesModule {}
