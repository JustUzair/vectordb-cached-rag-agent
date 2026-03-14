import { Document } from "@langchain/core/documents";
import { IngestSummary } from "./../types/kb.js";
import { getVectorStore } from "./03_vector_store.js";

export async function ingestDocuments(
  namespace: string,
  chunks: Document[],
): Promise<IngestSummary> {
  if (!namespace) {
    throw new Error("Namespace is needed!");
  }
  if (!chunks.length) {
    return {
      ok: false,
      namespace,
      totalChunks: 0,
      sources: [],
    };
  }

  const vectorStore = await getVectorStore();

  let currentId = 0;
  const docsWithMetadata = chunks.map(chunk => {
    const source = (chunk?.metadata?.source ?? "unknown_source") as string;
    const doc = new Document({
      pageContent: chunk.pageContent,
      metadata: {
        namespace,
        source,
        chunkId: currentId++,
      },
    });
    return doc;
  });
  await vectorStore.addDocuments(docsWithMetadata);
  const sources = Array.from(
    new Set(docsWithMetadata.map(doc => doc.metadata.source as string)),
  );
  return {
    ok: true,
    namespace,
    totalChunks: docsWithMetadata.length,
    sources,
  };
}
