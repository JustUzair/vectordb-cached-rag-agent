import { z } from "zod";
import { tool } from "langchain";
import { retrieveRelevantChunks } from "../kb/05_retriever.js";
import { makeModel } from "../utils/models.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
export const KBSearchTool = tool(
  async ({
    question,
    namespace = "default",
  }: {
    question: string;
    namespace: string;
  }) => {
    console.log("kb_search called with:", { question, namespace }); // ← add this
    const { confidence, docs } = await retrieveRelevantChunks(
      question,
      namespace,
      5,
    );
    console.log("retriever returned:", { confidence, docsCount: docs.length }); // ← add this

    const contexts = await Promise.all(
      docs.map(async doc => {
        const source = (doc.metadata.source as string) || "unknown_source";
        const chunkId = (doc.metadata.chunkId as number) ?? 0;
        const raw =
          doc.pageContent.length > 0
            ? doc.pageContent.slice(0, 400) + "..."
            : doc.pageContent;

        // ── Summarize if markdown, otherwise use raw as readable ──
        const readable = looksLikeMarkdown(raw)
          ? await summarizeMarkdown(raw)
          : raw;

        console.log(`RAW: `, raw, "\n\n");
        console.log(`Readable`, readable, "\n\n");
        return {
          source,
          chunkId,
          preview: raw,
          readablePreview: readable,
        };
      }),
    );

    // console.log(contexts);

    return JSON.stringify({ confidence, namespace, contexts });
  },
  {
    name: "kb_search",
    description:
      "Search the available knowledge-base for relevant information.",
    schema: z.object({
      question: z
        .string()
        .describe(
          "User's question of follow up that must be answered from knowledge-base",
        ),
      namespace: z
        .string()
        .default("default")
        .describe("Knowledge-base namespace to search"),
    }),
  },
);

// ── Markdown detection ─────────────────────────────────────────────────────
const MD_PATTERNS = [
  /^#{1,6}\s/m, // headings
  /\*\*[^*]+\*\*/, // bold
  /`{1,3}[^`]+`{1,3}/, // inline or fenced code
  /^\s*[-*+]\s/m, // unordered list
  /^\s*\d+\.\s/m, // ordered list
  /\[.+\]\(.+\)/, // links
];

function looksLikeMarkdown(text: string): boolean {
  return MD_PATTERNS.some(re => re.test(text));
}

// ── Summarize a markdown chunk into plain readable text ────────────────────
async function summarizeMarkdown(raw: string): Promise<string> {
  const model = makeModel({ temperature: 0 });
  const response = await model.invoke([
    new SystemMessage(
      "You are a MD to Text converted. Convert the markdown content into " +
        "clear, concise plain text. Preserve all key facts, numbers, " +
        "identifiers, and technical details. Do not add any information " +
        "not present in the input. Do not change any alphabet just format the md into text, and Output plain prose only, no markdown and NO HALLUCINATION OR ASSUMPTIONS.",
    ),
    new HumanMessage(raw),
  ]);
  return typeof response.content === "string"
    ? response.content.trim()
    : (response.content as any[])
        .map(b => b?.text ?? "")
        .join("")
        .trim();
}
