import { NextFunction, Request, Response } from "express";
import { runProductAgent } from "../agent/03_agent.js";

export default {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body as {
        message?: string;
      };

      if (!message || !message.trim()) {
        return res.status(400).json({
          ok: false,
          message: "Message is required!!!",
        });
      }

      const userMsg = {
        content: message.trim(),
        role: "user" as const,
      };

      const { answer, citations } = await runProductAgent([userMsg]);

      return res.status(200).json({
        ok: true,
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
};
