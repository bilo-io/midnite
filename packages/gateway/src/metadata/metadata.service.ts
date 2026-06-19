import { Injectable } from '@nestjs/common';
import type { LinkMetadataResponse } from '@midnite/shared';
import { fetchSourceMetadata } from '../projects/lib/opengraph';

/**
 * Proxies the SSRF-guarded link-metadata fetch (OpenGraph/title + favicon) for
 * clients that can't fetch arbitrary cross-origin HTML themselves. The heavy
 * lifting lives in `fetchSourceMetadata`; this owns the gateway-facing seam.
 */
@Injectable()
export class MetadataService {
  fetch(url: string): Promise<LinkMetadataResponse> {
    return fetchSourceMetadata(url);
  }
}
