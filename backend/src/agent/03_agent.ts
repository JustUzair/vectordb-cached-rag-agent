import { createAgent, providerStrategy, toolStrategy } from "langchain";
import { AgentResponseSchema, AgentResponse } from "../types/agent.js";
import { makeModel } from "../utils/models.js";
import { KBSearchTool } from "./02_tools.js";
import { AGENT_SYSTEM_PROMPT } from "./01_policy.js";
import { env } from "../utils/env.js";

const model = makeModel({ temperature: 0 });
if (!model) {
  throw new Error("No model found");
}
const providerResponseFormat = providerStrategy(AgentResponseSchema);

const toolResponseFormat = toolStrategy(AgentResponseSchema);

export const ProductAgent = createAgent({
  model: model,
  tools: [KBSearchTool],
  systemPrompt: AGENT_SYSTEM_PROMPT,
  responseFormat: (env.MODEL_PROVIDER === "gemini" ||
  env.MODEL_PROVIDER === "openai"
    ? providerResponseFormat
    : toolResponseFormat) as any,
});

export async function runProductAgent(
  messages: { role: string; content: string; namespace: string }[],
): Promise<{ answer: string; citations: any[] }> {
  const result = await ProductAgent.invoke({ messages });
  //   console.log(
  //     `runProductAgent::structuredResponse \n\n`,
  //     result.structuredResponse,
  //     `\n\n`,
  //   );
  //   console.log(
  //     `runProductAgent::messages \n\n`,
  //     result.messages.map(message => message),
  //     `\n\n`,
  //   );

  if (result.structuredResponse) {
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
