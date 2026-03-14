import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from "../types/kb";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: DEFAULT_CHUNK_SIZE,
  chunkOverlap: DEFAULT_CHUNK_OVERLAP,
});

export async function splitAndChunkDocs(docs: Document[]): Promise<Document[]> {
  if (!docs.length) return [] as Document[];

  const chunks = await splitter.splitDocuments(docs);
  return chunks.map((chunk, idx) => {
    const base = chunk.metadata ?? {};
    return {
      pageContent: chunk.pageContent ?? "",
      metadata: {
        ...base,
        source: base?.source ?? "unknown_source",
        _chunkIndex: idx,
      },
    };
  });
}
