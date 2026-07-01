import { Controller, Inject, NotFoundException, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { InboundRequest } from './adapters';
import {
  InboundReceiverService,
  InboundSignatureError,
  InboundSourceUnavailableError,
} from './inbound-receiver.service';

/**
 * The unauthenticated (by session) inbound receiver — the **provider signature**
 * is the gate. Reads the raw request bytes (captured by the scoped content-type
 * parser in bootstrap) so the HMAC covers exactly what the sender signed.
 */
@Controller('integrations/inbound')
export class InboundReceiverController {
  constructor(@Inject(InboundReceiverService) private readonly receiver: InboundReceiverService) {}

  @Post(':id')
  async receive(
    @Param('id') id: string,
    @Req() request: FastifyRequest & { rawBody?: string },
  ): Promise<{ result: string; taskId?: string }> {
    const req: InboundRequest = {
      rawBody: request.rawBody ?? '',
      headers: request.headers as Record<string, string | undefined>,
      parsed: request.body,
    };
    try {
      return await this.receiver.receive(id, req);
    } catch (err) {
      if (err instanceof InboundSourceUnavailableError) throw new NotFoundException(err.message);
      if (err instanceof InboundSignatureError) throw new UnauthorizedException(err.message);
      throw err;
    }
  }
}
