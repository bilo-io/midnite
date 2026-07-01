import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DeckContentSchema,
  deriveDeckFormat,
  type CreateDeckRequest,
  type Deck,
  type DeckContent,
  type DeckSummary,
  type TeamScope,
  type UpdateDeckRequest,
} from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import { deckToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import type { SlideDeckRow } from '../db/schema';
import { SlidesRepository } from './slides.repository';

const EMPTY_CONTENT: DeckContent = { slides: [] };

@Injectable()
export class SlidesService {
  constructor(
    @Inject(SlidesRepository) private readonly repo: SlidesRepository,
    // Optional: see WorkflowsService — global index in prod, omitted in unit specs.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  // --- reads ---

  listSummaries(scope?: TeamScope): DeckSummary[] {
    return this.repo.listDeckRows(scope).map((row) => this.toSummary(row));
  }

  getDeck(id: string, scope?: TeamScope): Deck {
    const row = this.repo.getDeckRow(id, scope);
    if (!row) throw new NotFoundException(`deck ${id} not found`);
    return this.hydrate(row);
  }

  // --- writes ---

  create(req: CreateDeckRequest, scope?: TeamScope): Deck {
    const content = this.parseContent(req.content ?? EMPTY_CONTENT);
    const now = new Date().toISOString();
    const row = this.repo.insertDeck({
      id: randomUUID(),
      name: req.name,
      description: req.description ?? null,
      slideCount: content.slides.length,
      format: deriveDeckFormat(content.slides),
      content: JSON.stringify(content),
      createdAt: now,
      updatedAt: now,
      createdBy: scope?.userId ?? null,
      teamId: scope?.teamId ?? null,
    });
    const deck = this.hydrate(row);
    this.searchIndex?.upsert(deckToIndexDoc(deck));
    this.audit?.record({ entityType: 'deck', entityId: deck.id, userId: scope?.userId, action: 'deck.created' });
    return deck;
  }

  update(id: string, req: UpdateDeckRequest, scope?: TeamScope): Deck {
    const current = this.getDeck(id, scope); // 404 if missing / out of scope
    const content = req.content !== undefined ? this.parseContent(req.content) : current.content;
    const patch: Partial<SlideDeckRow> = {
      slideCount: content.slides.length,
      format: deriveDeckFormat(content.slides),
      content: JSON.stringify(content),
      updatedAt: new Date().toISOString(),
    };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;

    const row = this.repo.updateDeck(id, patch);
    if (!row) throw new NotFoundException(`deck ${id} not found`);
    const deck = this.hydrate(row);
    this.searchIndex?.upsert(deckToIndexDoc(deck));
    this.audit?.record({ entityType: 'deck', entityId: deck.id, action: 'deck.updated' });
    return deck;
  }

  delete(id: string, scope?: TeamScope): void {
    this.getDeck(id, scope); // 404 if missing / out of scope
    this.repo.deleteDeck(id);
    this.searchIndex?.remove('deck', id);
    this.audit?.record({ entityType: 'deck', entityId: id, action: 'deck.deleted' });
  }

  // --- helpers ---

  private parseContent(content: unknown): DeckContent {
    const parsed = DeckContentSchema.safeParse(content);
    if (!parsed.success) throw new BadRequestException(`invalid deck content: ${parsed.error.message}`);
    return parsed.data;
  }

  private hydrate(row: SlideDeckRow): Deck {
    const content = DeckContentSchema.parse(JSON.parse(row.content));
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      slideCount: row.slideCount,
      format: row.format as Deck['format'],
      content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
      teamId: row.teamId ?? undefined,
    };
  }

  private toSummary(row: SlideDeckRow): DeckSummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      slideCount: row.slideCount,
      format: row.format as DeckSummary['format'],
      updatedAt: row.updatedAt,
      teamId: row.teamId ?? undefined,
    };
  }
}
