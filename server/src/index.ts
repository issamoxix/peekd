import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import db from "./db/index.js";
import projectsRouter from "./routes/projects.js";
import analysisRouter from "./routes/analysis.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  // Verify db is working
  const result = db.prepare("SELECT 1 as ok").get() as { ok: number };
  res.json({ status: "ok", db: result.ok === 1, timestamp: new Date().toISOString() });
});

app.use("/api/projects", projectsRouter);
app.use("/api/projects", analysisRouter);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown for tsx watch
process.on("SIGTERM", () => {
  server.close();
});
process.on("SIGINT", () => {
  server.close();
});
