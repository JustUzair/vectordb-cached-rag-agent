import { NextFunction, Request, Response } from "express";
import { runProductAgent } from "../agent/03_agent.js";
import {
  appendToHistory,
  ensureThreadId,
  getChatHistory,
  getPaginatedHistory,
} from "../agent/04_memory.js";

export default {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        message,
        namespace,
        threadId: incomingThreadId,
      } = req.body as {
        message?: string;
        namespace?: string;
        threadId?: string;
      };

      if (!message || !message.trim()) {
        return res.status(400).json({
          ok: false,
          message: "Message is required!!!",
        });
      }

      const threadId = await ensureThreadId(incomingThreadId);
      const history = await getChatHistory(threadId);
      const userMsg = {
        content: message.trim(),
        role: "user" as const,
        namespace: namespace ?? "default",
      };

      await appendToHistory(threadId, userMsg);

      const messageToAgent = [...history, userMsg].map(msg => ({
        role: msg.role,
        content: msg.content,
        namespace: msg.namespace ?? namespace ?? "default",
      }));

      const { answer, citations } = await runProductAgent(messageToAgent);
      const assistantMsg = {
        role: "assistant" as const,
        content: answer,
        namespace: namespace ?? "default",
      };
      await appendToHistory(threadId, assistantMsg);
      return res.status(200).json({
        ok: true,
        threadId,
        answer,
        citations,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        ok: false,
        message: (err as Error).message ?? "Internal Server Error",
      });
    }
  },
  getHistory: async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const limit = Math.min(Number(req.query.limit ?? 20), 50); // cap at 50
      const skip = Number(req.query.skip ?? 0);

      if (!threadId) {
        return res
          .status(400)
          .json({ ok: false, message: "threadId required" });
      }

      const { messages, total } = await getPaginatedHistory(
        threadId,
        skip,
        limit,
      );

      return res.status(200).json({
        ok: true,
        threadId,
        messages,
        total,
        hasMore: skip + limit < total,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        ok: false,
        message: (err as Error).message ?? "Internal Server Error",
      });
    }
  },
};
