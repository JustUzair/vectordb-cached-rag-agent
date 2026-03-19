import { Router } from "express";
import AgentController from "../controllers/agent.js";
const router = Router();

router.post("/chat", AgentController.chat);
router.get("/history/:threadId", AgentController.getHistory);

export default router;
