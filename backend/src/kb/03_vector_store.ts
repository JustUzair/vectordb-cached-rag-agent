import { Collection as MongoDBCollection } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { getDb } from "../utils/mongo-client";
import { env } from "../utils/env";
import { makeEmbeddingsModel } from "../utils/models";

const db = getDb();
let collectionPromise: Promise<MongoDBCollection> | null = null;
let vectorStorePromise: Promise<MongoDBAtlasVectorSearch> | null = null;

export async function getKbCollection(): Promise<MongoDBCollection> {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      return getDb().collection(env.MONGODB_COLLECTION_NAME, {});
    })();
  }
  return collectionPromise;
}
export async function getVectorStore(): Promise<MongoDBAtlasVectorSearch> {
  if (!vectorStorePromise) {
    vectorStorePromise = (async () => {
      const embeddings = makeEmbeddingsModel();
      const collection = await getKbCollection();
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: collection as any,
        indexName: env.MONGODB_INDEX_NAME,
        textKey: "text",
        embeddingKey: "embedding",
      });

      return vectorStore;
    })();
  }
  return vectorStorePromise;
}
