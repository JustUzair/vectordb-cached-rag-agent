import z from "zod";
import { env } from "../utils/env.js";

export const AgentResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      source: z.string(),
      chunkId: z.number(),
      preview: z.string(),
      readablePreview: z.string(),
    }),
  ),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  ts?: Date;
  namespace?: string;
}
export interface ConversationDoc {
  threadId: string;
  messages: {
    role: ChatRole;
    content: string;
    ts?: Date;
    namespace?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export const ConversationCollection = env.MONGODB_CONVERSATION_COLLECTION_NAME;
