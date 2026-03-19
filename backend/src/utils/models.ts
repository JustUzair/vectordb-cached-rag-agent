import { ChatGroq } from "@langchain/groq";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { env } from "./env.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { TaskType } from "@google/generative-ai";
import { ModelOptions } from "../types/models.js";

export function makeModel(opts: ModelOptions = {}): BaseChatModel {
  const temperature = opts.temperature ?? 0.2;
  switch (env.MODEL_PROVIDER) {
    case "gemini":
      return new ChatGoogleGenerativeAI({
        apiKey: env.GEMINI_API_KEY!,
        model: env.GEMINI_MODEL!,
        temperature,
        maxOutputTokens: opts.maxTokens,
      });
    case "openai":
      return new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY!,
        model: env.OPENAI_MODEL!,
        temperature,
        maxTokens: opts.maxTokens,
      });

    case "groq":
    default:
      return new ChatGroq({
        apiKey: env.GROQ_API_KEY!,
        model: env.GROQ_MODEL!,
        temperature: 0.6,
        maxTokens: opts.maxTokens,
      });
  }
}

export function makeEmbeddingsModel(opts: ModelOptions = {}): Embeddings {
  switch (env.RAG_MODEL_PROVIDER) {
    case "gemini":
      return new GoogleGenerativeAIEmbeddings({
        apiKey: env.GEMINI_API_KEY,
        model: "gemini-embedding-001",
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
    case "openai":
      return new OpenAIEmbeddings({
        apiKey: env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      });
  }
}
