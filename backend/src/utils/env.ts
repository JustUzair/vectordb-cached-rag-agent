import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  MODEL_PROVIDER: z.enum(["gemini", "openai", "groq"]).default("gemini"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  PORT: z.string().default("8000"),
  ALLOWED_ORIGIN: z.string().min(1),
  OPENAI_MODEL: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  RAG_MODEL_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  MONGODB_ATLAS_URI: z.url().min(1, "MongoDB URI is required"),
  MONGODB_NAME: z.string().min(1, "MongoDB name is required"),
  MONGODB_COLLECTION_NAME: z
    .string()
    .min(1, "MongoDB collection name is required"),
  MONGODB_INDEX_NAME: z.string().min(1, "MongoDB index name is required"),
  MONGODB_KB_CACHE_COLLECTION: z
    .string()
    .min(1, "MongoDB KB cache collection is required"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.log("Incorrect .env configuration");
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
