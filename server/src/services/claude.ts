import Anthropic from "@anthropic-ai/sdk";
import type { BrandBrief, GapAnalysis, ContentStrategy } from "shared";
import { GAP_ANALYSIS_SYSTEM, formatGapAnalysisPrompt } from "../prompts/gap-analysis.js";
import { CONTENT_STRATEGY_SYSTEM, formatStrategyPrompt } from "../prompts/content-strategy.js";
import { SNAPSHOT_COMPARISON_SYSTEM, formatSnapshotPrompt } from "../prompts/snapshot-comparison.js";

const anthropic = new Anthropic();

function parseJsonResponse<T>(response: Anthropic.Message): T {
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in response");
  }
  const clean = textBlock.text.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(clean) as T;
}

export interface PeecData {
  brandReport: unknown;
  domainReport: unknown;
  chats: unknown[];
  searchQueries: unknown[];
}

export interface GapAnalysisResult {
  currentStateSummary: string;
  targetState: string;
  gaps: Array<{
    id: string;
    description: string;
    severity: "High" | "Medium" | "Low";
    currentClaim: string;
    desiredClaim: string;
    rationale: string;
  }>;
  citationSources: Array<{
    domain: string;
    trustSignal: string;
    mentionCount: number;
  }>;
}

export async function synthesizeGapAnalysis(
  brandBrief: BrandBrief,
  peecData: PeecData
): Promise<GapAnalysisResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: GAP_ANALYSIS_SYSTEM,
    messages: [{ role: "user", content: formatGapAnalysisPrompt(brandBrief, peecData) }],
  });

  return parseJsonResponse<GapAnalysisResult>(response);
}

export interface StrategyResult {
  articles: Array<{
    id: string;
    title: string;
    targetQuery: string;
    keyClaims: string[];
    wordCount: number;
    internalLinkingTargets: string[];
    schemaType: string;
  }>;
  structuredData: Array<{
    id: string;
    schemaType: string;
    purpose: string;
    gapAddressed: string;
    jsonLd: string;
  }>;
  prAngles: Array<{
    id: string;
    headline: string;
    publicationType: string;
    hook: string;
    keyDataPoint: string;
    targetClaim: string;
  }>;
  quickWins: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
}

export async function generateStrategy(
  brandBrief: BrandBrief,
  gapAnalysis: GapAnalysisResult
): Promise<StrategyResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: CONTENT_STRATEGY_SYSTEM,
    messages: [{ role: "user", content: formatStrategyPrompt(brandBrief, gapAnalysis) }],
  });

  return parseJsonResponse<StrategyResult>(response);
}

export interface SnapshotComparisonResult {
  sentimentShift: Record<string, { change: number; direction: "improved" | "declined" | "unchanged" }>;
  citationRateChange: number;
  newDomains: string[];
  lostDomains: string[];
  trajectory: "On track" | "Needs attention" | "Regressing";
  summary: string;
}

export async function compareSnapshots(
  baseline: PeecData,
  current: PeecData,
  brandName: string
): Promise<SnapshotComparisonResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SNAPSHOT_COMPARISON_SYSTEM,
    messages: [{ role: "user", content: formatSnapshotPrompt(baseline, current, brandName) }],
  });

  return parseJsonResponse<SnapshotComparisonResult>(response);
}
