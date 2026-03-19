import type { Collection, WithId } from "mongodb";
import {
  ChatMessage,
  ConversationCollection,
  ConversationDoc,
} from "../types/agent.js";
import { getDb } from "../utils/mongo-client.js";
import { nanoid } from "nanoid";
let conversationCollectionPromise: Promise<Collection<ConversationDoc>> | null =
  null;

export async function getConversationsCollection(): Promise<
  Collection<ConversationDoc>
> {
  if (!conversationCollectionPromise) {
    conversationCollectionPromise = (async () => {
      const db = getDb();
      const collection = db.collection<ConversationDoc>(ConversationCollection);
      await collection.createIndex(
        {
          threadId: 1,
        },
        {
          unique: true,
        },
      );
      return collection;
    })();
  }
  return conversationCollectionPromise;
}

export async function ensureThreadId(idToCheck?: string): Promise<string> {
  const collection = await getConversationsCollection();
  if (idToCheck) {
    const doc = await collection.findOne({
      threadId: idToCheck,
    });
    if (doc) return idToCheck;
  }
  const threadId = nanoid();
  const now = new Date();

  await collection.insertOne({
    threadId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  });

  return threadId;
}

export async function getChatHistory(threadId: string): Promise<ChatMessage[]> {
  const collection = await getConversationsCollection();
  const conversation: WithId<ConversationDoc> | null = await collection.findOne(
    {
      threadId,
    },
  );

  if (!conversation) return [];

  return conversation.messages.map(message => {
    return {
      role: message.role,
      content: message.content,
      ts: message.ts,
    };
  });
}

export async function appendToHistory(
  threadId: string,
  ...messages: ChatMessage[]
): Promise<void> {
  if (!messages.length) return;
  const collection = await getConversationsCollection();

  const messagesWithTs = messages.map(message => {
    return {
      ...message,
      ts: message.ts ?? new Date(),
    };
  });

  await collection.updateOne(
    {
      threadId,
    },
    {
      $push: {
        messages: {
          $each: messagesWithTs,
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );
}

export async function getPaginatedHistory(
  threadId: string,
  skip: number,
  limit: number,
): Promise<{ messages: ChatMessage[]; total: number }> {
  const collection = await getConversationsCollection();
  const doc = await collection.findOne(
    { threadId },
    {
      projection: {
        // $slice with negative start = from the end
        // [-skip - limit, limit] = go back (skip+limit) from end, take limit
        messages: { $slice: [-(skip + limit), limit] },
        _count: { $size: "$messages" }, // won't work inline — see note below
      },
    },
  );

  if (!doc) return { messages: [], total: 0 };

  // Get total separately (MongoDB can't mix $slice + $size in same projection)
  const totalDoc = await collection.findOne(
    { threadId },
    {
      projection: {
        total: { $size: "$messages" },
        _id: 0,
      },
    },
  );

  const total = (totalDoc as any)?.total ?? 0;

  return {
    messages: (doc.messages ?? []).map(msg => ({
      role: msg.role,
      content: msg.content,
      ts: msg.ts,
      namespace: msg.namespace,
    })),
    total,
  };
}
