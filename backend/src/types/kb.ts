export interface KBChunk {
  namespace: string; // logical grouping for chunks
  source: string; // source file
  chunkId: number;
  text: string;
  embeddings: number[];
}

export type SupportedMime = "application/pdf" | "text/markdown" | "text/plain";
export interface LoadFileArgs {
  filePath: string;
  mimeType: SupportedMime;
  originalName: string;
}

export const DEFAULT_CHUNK_SIZE = 800;
export const DEFAULT_CHUNK_OVERLAP = 200;
export interface IngestSummary {
  ok: boolean;
  namespace: string;
  totalChunks: number;
  sources: string[];
}
