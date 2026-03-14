import { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { loadFileAsDocuments } from "../kb/01_loader.js";
import { SupportedMime } from "../types/kb.js";
import { splitAndChunkDocs } from "../kb/02_splitter.js";
import { ingestDocuments } from "../kb/04_ingest.js";

// No more diskStorage, no uploadPath, no fs.mkdirSync
export const uploadFileHandler = multer({
  storage: multer.memoryStorage(), // ← Buffer in req.file.buffer
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Unsupported file type"));
    cb(null, true);
  },
});

export default {
  upload: async (req: Request, res: Response) => {
    try {
      // Debug what is actually arriving
      console.log("Request Body:", req.body);
      console.log("Request Files:", req.files);
      console.log("Request File:", req.file);
      const namespace = "default";
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "No file uploaded" });
      }

      const {
        buffer,
        mimetype: mimeType,
        originalname: originalName,
      } = req.file;
      //       ↑ buffer instead of path

      const rawDocs = await loadFileAsDocuments({
        buffer,
        mimeType: mimeType as SupportedMime,
        originalName,
      });

      if (!rawDocs.length) {
        return res
          .status(400)
          .json({ ok: false, message: "Unsupported or empty file" });
      }

      const chunks = await splitAndChunkDocs(rawDocs);
      if (!chunks.length) {
        return res.status(400).json({
          ok: false,
          message: "File loaded but no usable chunks found",
        });
      }

      const summary = await ingestDocuments(namespace, chunks);
      return res.status(200).json({
        ok: summary.ok,
        namespace: summary.namespace,
        totalChunks: summary.totalChunks,
        sources: summary.sources,
        message: summary?.message,
      });
    } catch (err) {
      console.log((err as Error).message);
      res.status(500).json({
        message: "Something went wrong with file upload!",
        success: false,
      });
    }
  },

  ingest: async (req: Request, res: Response) => {},
  uploadFileHandler,
};
