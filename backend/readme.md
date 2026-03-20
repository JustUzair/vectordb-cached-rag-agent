<div align="center">

# Tessera::Backend

**Express · LangChain · MongoDB Atlas · TypeScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-7.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![LangChain](https://img.shields.io/badge/LangChain-1.x-1C3C3C?style=flat-square&logo=chainlink&logoColor=white)](https://js.langchain.com)
[![Vitest](https://img.shields.io/badge/Vitest-4.x-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)](https://tessera-rag-ai-backend.vercel.app)

**[Live API](https://tessera-rag-ai-backend.vercel.app)** · **[Postman Docs](https://documenter.getpostman.com/view/20867739/2sBXihrYt8)**

</div>

---

## Overview

The Tessera backend is a Node.js/Express API that powers a private document intelligence system. It exposes two route families, a Knowledge Base pipeline for ingesting documents and a LangChain agent for querying them with grounded, citation-backed responses.

The agent is hardened by a strict system prompt that forbids answering before calling `kb_search`, forbids blending training knowledge with retrieved context, and requires structured JSON output on every response. Three LLM providers are supported interchangeably at runtime via environment variable: Google Gemini (default), OpenAI, and Groq.

---

## Architecture

### Request Flow

```
  Incoming Request
        │
        ▼
  Rate Limiter
  (10 req / 10 min / IP in production)
        │
        ▼
  CORS  →  express.json (10kb limit)
        │
        ├──────────────────────────────┐
        ▼                              ▼
  /api/v1/kb                    /api/v1/agent
  KBRouter                      AgentRouter
        │                              │
        ├── GET /namespaces            ├── POST /chat
        ├── POST /upload               └── GET /history/:threadId
        └── POST /ingest (stub)
```

### KB Ingestion Pipeline

```
  POST /api/v1/kb/upload
  multipart/form-data { file, namespace, source? }
          │
          ▼
  multer memoryStorage  →  req.file.buffer
  fileFilter: .pdf / .txt / .md only
  maxSize: 10 MB
          │
          ▼
  01_loader.ts
  ├── .pdf  →  PDFLoader (blob)
  └── .txt / .md  →  TextLoader (utf-8 decode)
          │
          ▼  Document[]
  02_splitter.ts
  RecursiveCharacterTextSplitter
  chunkSize: 800  ·  chunkOverlap: 200
          │
          ▼  chunks[]
  04_ingest.ts
  ├── Dedup: collection.find({ namespace, source: { $in: sources } })
  │   └── cache hit → return early, no embedding cost
          │
          ▼  new docs only
  03_vector_store.ts
  CacheBackedEmbeddings.fromBytesStore(
    makeEmbeddingsModel(),     ← Gemini / OpenAI
    MongoDBStore(kb_cache),    ← BytesStore KV
    { namespace: "kb_cache" }
  )
  MongoDBAtlasVectorSearch.addDocuments(chunks)
          │
          ▼
  Response { ok, namespace, totalChunks, sources, message }
```

### Agent Query Pipeline

```
  POST /api/v1/agent/chat
  { message, namespace, threadId? }
          │
          ▼
  ensureThreadId()
  ├── threadId provided + exists in DB → reuse
  └── otherwise → nanoid() + insertOne({ messages: [] })
          │
          ▼
  getChatHistory(threadId)  →  messages[]
          │
          ▼
  LangChain Agent
  model: makeModel({ temperature: 0 })
  tool: KBSearchTool (kb_search)
  systemPrompt: AGENT_SYSTEM_PROMPT
  responseFormat: providerStrategy or toolStrategy
  (selected by MODEL_PROVIDER env var)
          │
          └──► FORCED tool call: kb_search(question, namespace)
                    │
                    ▼
               05_retriever.ts
               vectorStore.similaritySearchWithScore(query, k=5, { namespace })
               confidence = normalize(max(scores))
                    │
                    ├── Markdown chunk?  →  summarizeMarkdown() via LLM
                    └── Plain chunk?    →  raw preview (400 char slice)
                    │
                    ▼
               contexts: [{ source, chunkId, preview, readablePreview }]
          │
          ▼
  Structured response { answer, citations[] }
          │
          ▼
  appendToHistory(threadId, userMsg, assistantMsg)
          │
          ▼
  Response { ok, threadId, answer, citations }
```

---

## Source Structure

```
backend/
├── src/
│   ├── agent/
│   │   ├── 01_policy.ts          # AGENT_SYSTEM_PROMPT, strict no-hallucination rules,
│   │   │                         # mandatory kb_search, JSON output shape
│   │   ├── 02_tools.ts           # kb_search LangChain tool, retrieves chunks, detects
│   │   │                         # markdown via regex, summarizes via LLM
│   │   ├── 03_agent.ts           # createAgent() with providerStrategy / toolStrategy
│   │   │                         # responseFormat switching, runProductAgent()
│   │   └── 04_memory.ts          # MongoDB conversation CRUD:
│   │                             # ensureThreadId · getChatHistory · appendToHistory
│   │                             # getPaginatedHistory (MongoDB $slice projection)
│   ├── controllers/
│   │   ├── agent.ts              # chat(), full pipeline orchestration
│   │   │                         # getHistory(), paginated with skip/limit (max 50)
│   │   └── kb.ts                 # upload(), multer → loader → splitter → ingest
│   │                             # listNamespaces(), collection.distinct("namespace")
│   ├── kb/
│   │   ├── 01_loader.ts          # loadFileAsDocuments(), PDF/MD/TXT → Document[]
│   │   ├── 02_splitter.ts        # splitAndChunkDocs(), 800 char / 200 overlap
│   │   ├── 03_vector_store.ts    # getVectorStore(), singleton CacheBackedEmbeddings
│   │   │                         # getKbCollection(), dedup index on namespace+source
│   │   │                         # getKbCacheCollection(), unique sparse index on key
│   │   ├── 04_ingest.ts          # ingestDocuments(), dedup check, addDocuments, IngestSummary
│   │   └── 05_retriever.ts       # retrieveRelevantChunks(), similaritySearchWithScore
│   │                             # namespace filter, confidence normalization
│   ├── routes/
│   │   ├── agent.ts              # POST /chat  ·  GET /history/:threadId
│   │   └── kb.ts                 # GET /namespaces  ·  POST /upload (multer middleware)
│   ├── tests/
│   │   └── api.test.ts           # 7 describe blocks, 15+ it cases via Supertest
│   ├── types/
│   │   ├── agent.ts              # AgentResponseSchema (Zod), ChatMessage, ConversationDoc
│   │   ├── kb.ts                 # KBChunk, SupportedMime, IngestSummary,
│   │   │                         # DEFAULT_CHUNK_SIZE=800, DEFAULT_CHUNK_OVERLAP=200
│   │   └── models.ts             # ModelOptions, EmbeddingsModelSchema, MakeModel
│   ├── utils/
│   │   ├── env.ts                # Zod EnvSchema, validates on startup, process.exit(1) on failure
│   │   ├── models.ts             # makeModel(), Gemini/OpenAI/Groq factory
│   │   │                         # makeEmbeddingsModel(), Gemini/OpenAI embeddings
│   │   └── mongo-client.ts       # Singleton MongoClient, connectDb(), closeDbConnection()
│   └── index.ts                  # Express setup, trust proxy, rate limit, CORS, routes,
│                                 # catch-all 404, startServer(), SIGTERM graceful shutdown
├── vercel.json                   # source /(.*) → /dist/index.js rewrite
├── tsup.config.ts                # esm format, minify, clean
└── vitest.config.ts              # node env, 30s testTimeout, src/tests/**/*.test.ts
```

---

## API Reference

### `GET /status`

```json
{ "status": "ok", "timestamp": "20/03/2026, 10:30:00 am" }
```

---

### `POST /api/v1/kb/upload`

**Request** (`multipart/form-data`)

```
file        File    required  .pdf / .txt / .md  max 10 MB
namespace   string  optional  defaults to "default"
source      string  optional  prepended to filename: "{source}-{filename}"
```

**Response 200**

```json
{
  "ok": true,
  "namespace": "research",
  "totalChunks": 14,
  "sources": ["lightrag-docs-report.pdf"],
  "message": "Documents ingested successfully"
}
```

**Cache hit 200**, same source + namespace already ingested:

```json
{ "ok": true, "message": "Document(s) already ingested (cache hit)", ... }
```

**Error 400**, no file, unsupported type, empty file, file too large.

---

### `GET /api/v1/kb/namespaces`

```json
{ "ok": true, "namespaces": ["default", "research", "contracts"] }
```

---

### `POST /api/v1/agent/chat`

**Request**

```json
{
  "message": "What are the key deliverables in section 4?",
  "namespace": "contracts",
  "threadId": "V1StGXR8_Z5jdHi6B"
}
```

`threadId` is optional. Omit on first message; a new thread ID is returned and must be sent on subsequent requests to maintain conversation context.

**Response 200**

```json
{
  "ok": true,
  "threadId": "V1StGXR8_Z5jdHi6B",
  "answer": "Section 4 specifies three key deliverables...",
  "citations": [
    {
      "source": "contract-2024-final.pdf",
      "chunkId": 12,
      "preview": "4.1 Deliverables include...",
      "readablePreview": "Section 4.1 lists the deliverables as..."
    }
  ]
}
```

**No-context response**, when `kb_search` returns empty or low-confidence results:

```json
{
  "answer": "I don't find relevant information in your knowledge base for this question.",
  "citations": []
}
```

---

### `GET /api/v1/agent/history/:threadId`

**Query parameters**

```
skip    number  default 0   offset from the most recent message
limit   number  default 20  max 50
```

**Response 200**

```json
{
  "ok": true,
  "threadId": "V1StGXR8_Z5jdHi6B",
  "messages": [
    {
      "role": "user",
      "content": "...",
      "ts": "2026-03-20T08:00:00.000Z",
      "namespace": "contracts"
    },
    {
      "role": "assistant",
      "content": "...",
      "ts": "2026-03-20T08:00:02.000Z",
      "namespace": "contracts"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

## Environment Variables

| Variable                               | Required    | Description                     | Example                             |
| -------------------------------------- | ----------- | ------------------------------- | ----------------------------------- |
| `MODEL_PROVIDER`                       | Yes         | Agent LLM provider              | `groq` / `gemini` / `openai`        |
| `RAG_MODEL_PROVIDER`                   | Yes         | Embeddings provider             | `gemini` / `openai`                 |
| `OPENAI_API_KEY`                       | Conditional | OpenAI API key                  | `sk-...`                            |
| `GEMINI_API_KEY`                       | Conditional | Google AI Studio API key        | `AIza...`                           |
| `GROQ_API_KEY`                         | Conditional | Groq API key                    | `gsk_...`                           |
| `OPENAI_MODEL`                         | Conditional | OpenAI chat model               | `gpt-4o-mini`                       |
| `GEMINI_MODEL`                         | Conditional | Gemini chat model               | `gemini-2.5-flash-lite`             |
| `GROQ_MODEL`                           | Conditional | Groq chat model                 | `llama-3.1-8b-instant`              |
| `PORT`                                 | No          | Server port                     | `8000`                              |
| `ALLOWED_ORIGIN`                       | Yes         | CORS whitelist                  | `https://tessera-rag-ai.vercel.app` |
| `MONGODB_ATLAS_URI`                    | Yes         | Atlas connection string         | `mongodb+srv://...`                 |
| `MONGODB_NAME`                         | Yes         | Database name                   | `tessera`                           |
| `MONGODB_CHUNK_STORE_COLLECTION_NAME`  | Yes         | Vector chunk collection         | `kb_chunks`                         |
| `MONGODB_INDEX_NAME`                   | Yes         | Atlas Vector Search index       | `vector_index`                      |
| `MONGODB_KB_CACHE_COLLECTION_NAME`     | Yes         | Embedding cache collection      | `kb_cache`                          |
| `MONGODB_CONVERSATION_COLLECTION_NAME` | Yes         | Conversation threads collection | `conversations`                     |

Zod validates every variable at startup. Missing or invalid configuration exits the process immediately with a printed error rather than failing silently at request time.

---

## Local Development

```bash
cd backend
cp .env.example .env
# Fill API keys and MongoDB URI
yarn install
yarn dev
```

`yarn dev` runs `tsc --noEmit` before starting `tsx watch`, so type errors surface before the server boots.

---

## Testing

```bash
cd backend
yarn test
```

Tests use Vitest + Supertest against a live Express app instance connected to MongoDB Atlas. The suite covers:

- `GET /status`: health check
- Unknown routes: 4xx enforcement
- `POST /api/v1/kb/upload`: no file, unsupported type (.jpg), oversized (>10MB), default namespace, `.txt` with namespace+source, duplicate detection (cache hit), `.md` ingestion, empty file, whitespace source
- `GET /api/v1/kb/namespaces`: array response, namespace presence after upload tests

Test timeout is 30 seconds to accommodate real embedding API calls.

---

## Deployment

```bash
cd backend
vercel --prod
```

Set all environment variables in the Vercel project dashboard before deploying. The `vercel.json` rewrites all traffic to `dist/index.js` compiled by `tsup`.

**Live:** [tessera-rag-ai-backend.vercel.app](https://tessera-rag-ai-backend.vercel.app)
