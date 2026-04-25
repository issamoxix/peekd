import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import db, { now } from "../db/index.js";
import { fetchBrandReport, fetchDomainReport, fetchChats, fetchSearchQueries } from "../services/peec.js";
import { synthesizeGapAnalysis, type PeecData, type GapAnalysisResult } from "../services/claude.js";
import type { BrandBrief, GapAnalysis, SSEProgressEvent, SSECompleteEvent, SSEErrorEvent } from "shared";

const router = Router();

// Helper to send SSE events
function sendSSE(res: Response, event: SSEProgressEvent | SSECompleteEvent<GapAnalysis> | SSEErrorEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Helper to set SSE headers
function setSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

// Helper to get brand brief by project ID
function getBrandBrief(projectId: string): BrandBrief | null {
  const row = db
    .prepare(
      `SELECT id, project_id, brand_name, domain, category, desired_tone,
              desired_claims, key_differentiators, competitors, created_at, updated_at
       FROM brand_briefs
       WHERE project_id = ?`
    )
    .get(projectId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  try {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      brandName: row.brand_name as string,
      domain: row.domain as string,
      category: row.category as string,
      desiredTone: row.desired_tone as BrandBrief["desiredTone"],
      desiredClaims: JSON.parse(row.desired_claims as string),
      keyDifferentiators: JSON.parse(row.key_differentiators as string),
      competitors: JSON.parse(row.competitors as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid JSON in brand brief";
    throw new Error(`Failed to parse brand brief: ${errorMessage}`);
  }
}

// Helper to convert DB row to GapAnalysis
function rowToGapAnalysis(row: Record<string, unknown>): GapAnalysis {
  try {
    const analysis = JSON.parse(row.analysis as string) as GapAnalysisResult;
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      currentStateSummary: analysis.currentStateSummary,
      targetState: analysis.targetState,
      gaps: analysis.gaps,
      citationSources: analysis.citationSources,
      createdAt: row.created_at as string,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid JSON in gap analysis";
    throw new Error(`Failed to parse gap analysis: ${errorMessage}`);
  }
}

// POST /api/projects/:id/analysis - Run gap analysis with SSE
router.post("/:id/analysis", async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const acceptHeader = req.get("Accept") || "";
  const useSSE = acceptHeader.includes("text/event-stream");

  // Check if project exists
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    if (useSSE) {
      setSSEHeaders(res);
      sendSSE(res, { type: "error", code: "NOT_FOUND", message: "Project not found" });
      return res.end();
    }
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  // Get brand brief
  let brief: BrandBrief | null;
  try {
    brief = getBrandBrief(projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load brand brief";
    if (useSSE) {
      setSSEHeaders(res);
      sendSSE(res, { type: "error", code: "BRIEF_ERROR", message: errorMessage });
      return res.end();
    }
    return res.status(500).json({ error: errorMessage, code: "BRIEF_ERROR" });
  }

  if (!brief) {
    if (useSSE) {
      setSSEHeaders(res);
      sendSSE(res, { type: "error", code: "NO_BRIEF", message: "No brand brief found for this project" });
      return res.end();
    }
    return res.status(400).json({ error: "No brand brief found for this project", code: "NO_BRIEF" });
  }

  if (useSSE) {
    // Set SSE headers
    setSSEHeaders(res);
    res.flushHeaders();

    try {
      // Step 1: Fetch brand report
      sendSSE(res, { type: "progress", step: "fetching_brand_report", status: "in_progress" });
      const brandReport = await fetchBrandReport(brief.brandName);
      sendSSE(res, { type: "progress", step: "fetching_brand_report", status: "complete" });

      // Step 2: Fetch domain report
      sendSSE(res, { type: "progress", step: "fetching_domain_report", status: "in_progress" });
      const domainReport = await fetchDomainReport(brief.domain);
      sendSSE(res, { type: "progress", step: "fetching_domain_report", status: "complete" });

      // Step 3: Fetch chats
      sendSSE(res, { type: "progress", step: "fetching_chats", status: "in_progress" });
      const chats = await fetchChats(brief.brandName);
      sendSSE(res, { type: "progress", step: "fetching_chats", status: "complete" });

      // Step 4: Fetch search queries (additional data for better analysis)
      sendSSE(res, { type: "progress", step: "fetching_search_queries", status: "in_progress" });
      const searchQueries = await fetchSearchQueries(brief.brandName);
      sendSSE(res, { type: "progress", step: "fetching_search_queries", status: "complete" });

      // Assemble PeecData
      const peecData: PeecData = {
        brandReport,
        domainReport,
        chats,
        searchQueries,
      };

      // Step 5: Synthesize gap analysis
      sendSSE(res, { type: "progress", step: "synthesizing_analysis", status: "in_progress" });
      const analysisResult = await synthesizeGapAnalysis(brief, peecData);
      sendSSE(res, { type: "progress", step: "synthesizing_analysis", status: "complete" });

      // Store in database
      const analysisId = uuid();
      const timestamp = now();

      db.prepare(
        `INSERT INTO gap_analyses (id, project_id, peec_data, analysis, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(analysisId, projectId, JSON.stringify(peecData), JSON.stringify(analysisResult), timestamp);

      // Create GapAnalysis object
      const gapAnalysis: GapAnalysis = {
        id: analysisId,
        projectId,
        currentStateSummary: analysisResult.currentStateSummary,
        targetState: analysisResult.targetState,
        gaps: analysisResult.gaps,
        citationSources: analysisResult.citationSources,
        createdAt: timestamp,
      };

      // Send completion event
      sendSSE(res, { type: "complete", data: gapAnalysis });
      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      sendSSE(res, { type: "error", code: "ANALYSIS_FAILED", message: errorMessage });
      res.end();
    }
  } else {
    // Non-SSE request - run synchronously and return JSON
    try {
      const peecData: PeecData = {
        brandReport: await fetchBrandReport(brief.brandName),
        domainReport: await fetchDomainReport(brief.domain),
        chats: await fetchChats(brief.brandName),
        searchQueries: await fetchSearchQueries(brief.brandName),
      };

      const analysisResult = await synthesizeGapAnalysis(brief, peecData);

      const analysisId = uuid();
      const timestamp = now();

      db.prepare(
        `INSERT INTO gap_analyses (id, project_id, peec_data, analysis, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(analysisId, projectId, JSON.stringify(peecData), JSON.stringify(analysisResult), timestamp);

      const gapAnalysis: GapAnalysis = {
        id: analysisId,
        projectId,
        currentStateSummary: analysisResult.currentStateSummary,
        targetState: analysisResult.targetState,
        gaps: analysisResult.gaps,
        citationSources: analysisResult.citationSources,
        createdAt: timestamp,
      };

      res.status(201).json(gapAnalysis);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ error: errorMessage, code: "ANALYSIS_FAILED" });
    }
  }
});

// GET /api/projects/:id/analysis - Get latest gap analysis
router.get("/:id/analysis", (req: Request, res: Response) => {
  const projectId = req.params.id;

  // Check if project exists
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const row = db
    .prepare(
      `SELECT id, project_id, peec_data, analysis, created_at
       FROM gap_analyses
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(projectId) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: "No gap analysis found for this project", code: "NO_ANALYSIS" });
  }

  try {
    const gapAnalysis = rowToGapAnalysis(row);
    res.json(gapAnalysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to parse gap analysis";
    res.status(500).json({ error: errorMessage, code: "PARSE_ERROR" });
  }
});

// GET /api/projects/:id/analysis/history - List past analyses
router.get("/:id/analysis/history", (req: Request, res: Response) => {
  const projectId = req.params.id;

  // Check if project exists
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const rows = db
    .prepare(
      `SELECT id, project_id, peec_data, analysis, created_at
       FROM gap_analyses
       WHERE project_id = ?
       ORDER BY created_at DESC`
    )
    .all(projectId) as Array<Record<string, unknown>>;

  try {
    const analyses: GapAnalysis[] = rows.map(rowToGapAnalysis);
    res.json(analyses);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to parse gap analyses";
    res.status(500).json({ error: errorMessage, code: "PARSE_ERROR" });
  }
});

export default router;
