import type { FigmaFileResponse, FigmaFile, FigmaFileNodesResponse, FigmaImageResponse } from './types';

export class FigmaClient {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers(): HeadersInit {
    return {
      'X-Figma-Token': this.token,
    };
  }

  async getFile(fileKey: string): Promise<FigmaFile> {
    const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Figma getFile failed: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as FigmaFileResponse;
    return json;
  }

  async getFileNodes(fileKey: string, ids: string[]): Promise<FigmaFileNodesResponse> {
    const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(ids.join(','))}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Figma getFileNodes failed: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as FigmaFileNodesResponse;
    return json;
  }

  async getImages(
    fileKey: string,
    ids: string[],
    params?: { format?: 'png' | 'jpg' | 'svg'; scale?: number }
  ): Promise<FigmaImageResponse> {
    const query = new URLSearchParams();
    query.set('ids', ids.join(','));
    if (params?.format) query.set('format', params.format);
    if (params?.scale) query.set('scale', String(params.scale));
    const url = `https://api.figma.com/v1/images/${encodeURIComponent(fileKey)}?${query.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Figma getImages failed: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as FigmaImageResponse;
    return json;
  }
}
