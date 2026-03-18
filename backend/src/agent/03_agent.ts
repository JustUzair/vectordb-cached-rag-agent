import { createAgent, providerStrategy } from "langchain";
import { AgentResponseSchema } from "../types/agent.js";
import { makeModel } from "../utils/models.js";
import { KBSearchTool } from "./02_tools.js";
import { AGENT_SYSTEM_PROMPT } from "./01_policy.js";

export const ProductAgent = createAgent({
  model: makeModel(),
  tools: [KBSearchTool],
  systemPrompt: AGENT_SYSTEM_PROMPT,
  responseFormat: providerStrategy(AgentResponseSchema),
});

export async function runProductAgent(
  messages: { role: string; content: string }[],
): Promise<{ answer: string; citations: any[] }> {
  const result = await ProductAgent.invoke({ messages });
  if (result?.structuredResponse) {
    return {
      answer: result.structuredResponse.answer,
      citations: result.structuredResponse.citations,
    };
  }
  return {
    answer: "",
    citations: [],
  };
}
