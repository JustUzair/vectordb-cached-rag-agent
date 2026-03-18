import { rateLimit } from "express-rate-limit";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import {
  connectDb,
  mongoClient,
  closeDbConnection,
} from "./utils/mongo-client.js";
import KBRouter from "./routes/kb.js";
import AgentRouter from "./routes/agent.js";

const DEBUG: boolean = !(process.env.NODE_ENV !== "production") ? true : false;
const limiter = rateLimit({
  limit: 10,
  windowMs: 10 * 60 * 1000, // 10 mins
  message: "Too many requests from this IP, please try again in an hour",
  handler: (_: Request, res: Response) => {
    res.status(429).json({
      status: "fail",
      message: "Too many requests from this IP, please try again later.",
      retryAfter: new Date(Date.now() + 60 * 60 * 1000).toLocaleString(
        "en-IN",
        {
          timeZone: "IST",
        },
      ),
    });
  },
});

const app = express();

app.get("/", (_: Request, res: Response) => {
  res.redirect("/status");
});
app.get("/favicon.ico", (_: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "public", "favicon.ico"));
});

// app.enable("trust proxy");
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  }),
);

app.use(
  "/api",
  process.env.NODE_ENV === "test"
    ? (_req: Request, _res: Response, next: any) => next()
    : limiter,
);

app.use("/status", (_: Request, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toLocaleString("en-IN", {
      timeZone: "IST",
    }),
  });
});

app.use(
  express.json({
    limit: "10kb",
  }),
);

app.use("/api/v1/kb", KBRouter);
app.use("/api/v1/agent", AgentRouter);

// Handling the unhandled routes
app.all("*", (req, res, next) => {
  next(new Error(`URL ${req.originalUrl} does not exist on this server !!!`));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT || 8000;
    await connectDb();
    const server = app.listen(port, () => {
      console.log(`App running on port ${port}`);
    });
    process.on("unhandledRejection", (err: Error) => {
      console.log(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
    /*  
    |----------------------------------------------------------------------|
    |   SIGTERM is a signal that is sent to request the process terminates |
    |   that were rejected whose rejections have not yet been handled.     |  
    |   In other words, it is used for graceful shutdown of server.        |
    |----------------------------------------------------------------------|
*/
    process.on("SIGTERM", async () => {
      // SIGTERM - signal fired when Heroku dynos restart
      console.log("SIGTERM RECEIVED! Shutting Down gracefully!");
      try {
        await closeDbConnection(mongoClient);
        console.log("MongoDB connection closed");
      } catch (e) {
        console.log(e);
      } finally {
        server.close(() => {
          console.log("Process Terminated");
        });
      }
    });
  }
}

startServer();

export default app;
