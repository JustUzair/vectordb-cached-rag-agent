import { z } from "zod";
import { tool } from "langchain";
import { retrieveRelevantChunks } from "../kb/05_retriever.js";

export const KBSearchTool = tool(
  async ({
    question,
    namespace = "default",
  }: {
    question: string;
    namespace: string;
  }) => {
    const { confidence, docs } = await retrieveRelevantChunks(
      question,
      namespace,
      2,
    );

    const contexts = docs.map(doc => {
      const source = (doc.metadata.source as string) || "unknown_source";
      const chunkId = (doc.metadata.chunkId as number) ?? 0;
      const preview =
        doc.pageContent.length > 0
          ? doc.pageContent.slice(0, 400) + "..."
          : doc.pageContent;
      return {
        source,
        chunkId,
        preview,
      };
    });

    console.log(contexts);

    return {
      confidence,
      namespace,
      contexts,
    };
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
