import { Router } from "express";
import { v4 as uuid } from "uuid";
import db, { now } from "../db/index.js";
import type { Project, BrandBrief, CreateProjectRequest, UpdateBriefRequest } from "shared";

const router = Router();

// List all projects
router.get("/", (_req, res) => {
  const projects = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       ORDER BY p.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const result: Project[] = projects.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: row.brief_id
      ? {
          id: row.brief_id as string,
          projectId: row.id as string,
          brandName: row.brand_name as string,
          domain: row.brief_domain as string,
          category: row.category as string,
          desiredTone: row.desired_tone as BrandBrief["desiredTone"],
          desiredClaims: JSON.parse(row.desired_claims as string),
          keyDifferentiators: JSON.parse(row.key_differentiators as string),
          competitors: JSON.parse(row.competitors as string),
          createdAt: row.brief_created_at as string,
          updatedAt: row.brief_updated_at as string,
        }
      : undefined,
  }));

  res.json(result);
});

// Get single project
router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       WHERE p.id = ?`
    )
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const project: Project = {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: row.brief_id
      ? {
          id: row.brief_id as string,
          projectId: row.id as string,
          brandName: row.brand_name as string,
          domain: row.brief_domain as string,
          category: row.category as string,
          desiredTone: row.desired_tone as BrandBrief["desiredTone"],
          desiredClaims: JSON.parse(row.desired_claims as string),
          keyDifferentiators: JSON.parse(row.key_differentiators as string),
          competitors: JSON.parse(row.competitors as string),
          createdAt: row.brief_created_at as string,
          updatedAt: row.brief_updated_at as string,
        }
      : undefined,
  };

  res.json(project);
});

// Create project with brief
router.post("/", (req, res) => {
  const body = req.body as CreateProjectRequest;
  const projectId = uuid();
  const briefId = uuid();
  const timestamp = now();

  const insertProject = db.prepare(
    `INSERT INTO projects (id, name, domain, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  const insertBrief = db.prepare(
    `INSERT INTO brand_briefs (id, project_id, brand_name, domain, category, desired_tone,
                               desired_claims, key_differentiators, competitors, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    insertProject.run(projectId, body.name, body.domain, timestamp, timestamp);
    insertBrief.run(
      briefId,
      projectId,
      body.brief.brandName,
      body.brief.domain,
      body.brief.category,
      body.brief.desiredTone,
      JSON.stringify(body.brief.desiredClaims),
      JSON.stringify(body.brief.keyDifferentiators),
      JSON.stringify(body.brief.competitors),
      timestamp,
      timestamp
    );
  });

  transaction();

  const project: Project = {
    id: projectId,
    name: body.name,
    domain: body.domain,
    createdAt: timestamp,
    updatedAt: timestamp,
    brief: {
      id: briefId,
      projectId,
      brandName: body.brief.brandName,
      domain: body.brief.domain,
      category: body.brief.category,
      desiredTone: body.brief.desiredTone,
      desiredClaims: body.brief.desiredClaims,
      keyDifferentiators: body.brief.keyDifferentiators,
      competitors: body.brief.competitors,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  res.status(201).json(project);
});

// Update brief
router.put("/:id", (req, res) => {
  const body = req.body as UpdateBriefRequest;
  const timestamp = now();

  const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.brandName !== undefined) {
    updates.push("brand_name = ?");
    values.push(body.brandName);
  }
  if (body.domain !== undefined) {
    updates.push("domain = ?");
    values.push(body.domain);
  }
  if (body.category !== undefined) {
    updates.push("category = ?");
    values.push(body.category);
  }
  if (body.desiredTone !== undefined) {
    updates.push("desired_tone = ?");
    values.push(body.desiredTone);
  }
  if (body.desiredClaims !== undefined) {
    updates.push("desired_claims = ?");
    values.push(JSON.stringify(body.desiredClaims));
  }
  if (body.keyDifferentiators !== undefined) {
    updates.push("key_differentiators = ?");
    values.push(JSON.stringify(body.keyDifferentiators));
  }
  if (body.competitors !== undefined) {
    updates.push("competitors = ?");
    values.push(JSON.stringify(body.competitors));
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(timestamp);
    values.push(req.params.id);

    db.prepare(
      `UPDATE brand_briefs SET ${updates.join(", ")} WHERE project_id = ?`
    ).run(...values);

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, req.params.id);
  }

  // Return updated project
  const row = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       WHERE p.id = ?`
    )
    .get(req.params.id) as Record<string, unknown>;

  const project: Project = {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: {
      id: row.brief_id as string,
      projectId: row.id as string,
      brandName: row.brand_name as string,
      domain: row.brief_domain as string,
      category: row.category as string,
      desiredTone: row.desired_tone as BrandBrief["desiredTone"],
      desiredClaims: JSON.parse(row.desired_claims as string),
      keyDifferentiators: JSON.parse(row.key_differentiators as string),
      competitors: JSON.parse(row.competitors as string),
      createdAt: row.brief_created_at as string,
      updatedAt: row.brief_updated_at as string,
    },
  };

  res.json(project);
});

// Delete project
router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }
  res.status(204).send();
});

export default router;
