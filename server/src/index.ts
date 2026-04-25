import express from "express";
import cors from "cors";
import { config } from "dotenv";
import db from "./db/index.js";
import projectsRouter from "./routes/projects.js";
import analysisRouter from "./routes/analysis.js";

config();

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
