import express from "express";
import KBController from "../controllers/kb.js";

const router = express.Router();

router.post(
  "/upload",
  KBController.uploadFileHandler.single("file") as any,
  KBController.upload,
);
router.post("/ingest", KBController.ingest);

export default router;
