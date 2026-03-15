// tests/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
  connectDb,
  closeDbConnection,
  mongoClient,
} from "../utils/mongo-client.js";
import app from "../index.js";

const API = "/api/v1";

// ── Test fixtures ─────────────────────────────────────────────────────────────
const TXT_CONTENT = Buffer.from(
  "LightRAG is a graph-based RAG framework that uses entity extraction " +
    "and knowledge graphs to retrieve and synthesize information from documents.",
  "utf-8",
);

const MD_CONTENT = Buffer.from(
  "# Test Document\n\nMongoDB Atlas Vector Search stores high-dimensional " +
    "embedding vectors. Cosine similarity is used to find semantically relevant chunks.",
  "utf-8",
);

// ── Setup / Teardown ──────────────────────────────────────────────────────────
beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await closeDbConnection(mongoClient);
});

// ═════════════════════════════════════════════════════════════════════════════
describe("PDF RAG Agent — API Tests", () => {
  // ── 1. HEALTH ───────────────────────────────────────────────────────────────
  describe("GET /status", () => {
    it("should return server health", async () => {
      const res = await request(app).get("/status");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  // ── 2. UNKNOWN ROUTE ────────────────────────────────────────────────────────
  describe("Unknown Routes", () => {
    it("should return an error for an unregistered route", async () => {
      const res = await request(app).get(`${API}/does-not-exist`);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── 3. UPLOAD — VALIDATION ───────────────────────────────────────────────────
  describe("POST /api/v1/kb/upload — validation", () => {
    it("should return 400 when no file is attached", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "test");
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject unsupported file types (.jpg)", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "test")
        .attach("file", Buffer.from("fake image data"), {
          filename: "photo.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject files exceeding 10MB", async () => {
      const oversized = Buffer.alloc(11 * 1024 * 1024, "a");
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "test")
        .attach("file", oversized, {
          filename: "big.txt",
          contentType: "text/plain",
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should default namespace to 'default' when not provided", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .attach("file", TXT_CONTENT, {
          filename: "no-namespace.txt",
          contentType: "text/plain",
        });
      // Zod schema default kicks in
      expect(res.status).toBe(200);
      expect(res.body.namespace).toBe("default");
    });
  });

  // ── 4. UPLOAD — TXT with namespace + source ──────────────────────────────────
  describe("POST /api/v1/kb/upload — .txt with form fields", () => {
    it("should ingest a .txt file with namespace and source prefix", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "research")
        .field("source", "lightrag-docs")
        .attach("file", TXT_CONTENT, {
          filename: "lightrag-test.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.namespace).toBe("research");
      expect(res.body.totalChunks).toBeGreaterThan(0);
      expect(Array.isArray(res.body.sources)).toBe(true);
      // controller prefixes: "lightrag-docs-lightrag-test.txt"
      expect(res.body.sources[0]).toContain("lightrag-docs");
      expect(res.body.sources[0]).toContain("lightrag-test.txt");
    });

    it("should return cache hit on re-uploading same file to same namespace", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "research")
        .field("source", "lightrag-docs")
        .attach("file", TXT_CONTENT, {
          filename: "lightrag-test.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toMatch(/already ingested|cache hit/i);
    });

    it("should use originalName as-is when source field is omitted", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "default")
        .attach("file", Buffer.from("No source label test content for RAG."), {
          filename: "no-source.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // source is "" (Zod default) → prefix branch skipped → raw filename
      expect(res.body.sources[0]).toBe("no-source.txt");
    });
  });

  // ── 5. UPLOAD — MARKDOWN ─────────────────────────────────────────────────────
  describe("POST /api/v1/kb/upload — .md ingestion", () => {
    it("should ingest a .md file with namespace and source", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "docs")
        .field("source", "mongo-ref")
        .attach("file", MD_CONTENT, {
          filename: "mongo-test.md",
          contentType: "text/markdown",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.namespace).toBe("docs");
      expect(res.body.totalChunks).toBeGreaterThan(0);
      expect(res.body.sources[0]).toContain("mongo-ref");
      expect(res.body.sources[0]).toContain("mongo-test.md");
    });

    it("should detect duplicate .md under same namespace + source", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "docs")
        .field("source", "mongo-ref")
        .attach("file", MD_CONTENT, {
          filename: "mongo-test.md",
          contentType: "text/markdown",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toMatch(/already ingested|cache hit/i);
    });
  });

  // ── 6. UPLOAD — EDGE CASES ───────────────────────────────────────────────────
  describe("POST /api/v1/kb/upload — edge cases", () => {
    it("should return 400 for an empty .txt file", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "default")
        .attach("file", Buffer.from(""), {
          filename: "empty.txt",
          contentType: "text/plain",
        });
      // Empty content → no chunks → controller returns 400
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should not 500 when source is whitespace only", async () => {
      const res = await request(app)
        .post(`${API}/kb/upload`)
        .field("namespace", "default")
        .field("source", "   ")
        .attach("file", Buffer.from("Whitespace source edge case content."), {
          filename: "ws-source.txt",
          contentType: "text/plain",
        });
      expect(res.status).not.toBe(500);
    });
  });

  // ── 7. NAMESPACES ─────────────────────────────────────────────────────────────
  describe("GET /api/v1/kb/namespaces", () => {
    it("should return ok with an array of namespaces", async () => {
      const res = await request(app).get(`${API}/kb/namespaces`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.namespaces)).toBe(true);
    });

    it("should include namespaces created during upload tests", async () => {
      const res = await request(app).get(`${API}/kb/namespaces`);
      expect(res.status).toBe(200);
      // Namespaces seeded by tests above
      expect(res.body.namespaces).toContain("research");
      expect(res.body.namespaces).toContain("personal");
      expect(res.body.namespaces).toContain("docs");
    });
  });
});
