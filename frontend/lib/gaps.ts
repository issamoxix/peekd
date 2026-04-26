import {
  brandReportRows,
  brands,
  domainReportRows,
  prompts,
  topics,
  untrackedQueries,
  urlReportRows,
} from "@/data/adblume-snapshot";
import type { BrandReportRow, Prompt, QueryGap } from "@/lib/types";

const competitors = brands.filter((brand) => !brand.isOwn).map((brand) => brand.name);

const positiveFitTerms = [
  "luxury",
  "fine jewelry",
  "jewelry",
  "editorial",
  "cinematic",
  "ai",
  "catalog",
  "ecommerce",
  "high-end",
  "dtc",
  "campaign",
  "video",
];

const lowFitTerms = ["cheap", "free", "bulk-only", "generic product photos", "low cost"];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function scoreByTerms(text: string, terms: string[], base = 0, step = 12, max = 100) {
  return Math.min(
    max,
    base + terms.reduce((score, term) => (text.includes(term) ? score + step : score), 0),
  );
}

function classifyIntent(query: string): QueryGap["customerIntent"] {
  const text = query.toLowerCase();
  if (text.includes("adblume")) return "evaluate_adblume";
  if (includesAny(text, ["vs", "alternatives", "compare"])) return "compare_vendors";
  if (includesAny(text, ["ai", "tool", "retouching"])) return "explore_ai";
  if (includesAny(text, ["catalog", "shopify", "ecommerce", "marketplace"])) return "launch_ecommerce";
  return "hire_studio";
}

function classifyFunnel(query: string): QueryGap["funnelStage"] {
  const text = query.toLowerCase();
  if (includesAny(text, ["vs", "alternatives", "pricing", "best", "service", "studio", "partner"])) {
    return "decision";
  }
  if (includesAny(text, ["compare", "tool", "how", "can"])) return "consideration";
  return "awareness";
}

function routeAction(query: string): QueryGap["recommendedAction"] {
  const text = query.toLowerCase();
  if (text.includes("vs")) return "create_comparison_page";
  if (text.includes("alternatives")) return "create_alternatives_page";
  if (includesAny(text, ["how", "can", "what"])) return "create_faq_article";
  if (includesAny(text, ["best", "top"])) return text.includes("studio") ? "create_service_page" : "create_listicle";
  if (includesAny(text, ["video", "catalog", "service", "studio", "partner"])) return "create_service_page";
  return "source_outreach";
}

function alignedPropositions(query: string) {
  const text = query.toLowerCase();
  const propositions = new Set<string>();
  if (includesAny(text, ["ai", "retouching", "tool"])) propositions.add("AI-assisted innovation");
  if (includesAny(text, ["luxury", "fine jewelry", "high-end", "dtc"])) propositions.add("Luxury aesthetic");
  if (includesAny(text, ["campaign", "cinematic", "video"])) propositions.add("Editorial-grade quality");
  if (includesAny(text, ["catalog", "ecommerce", "shopify", "marketplace"])) {
    propositions.add("Efficient/scalable production");
  }
  if (text.includes("jewelry")) propositions.add("Jewelry-specific expertise");
  return Array.from(propositions);
}

function riskFlags(query: string) {
  const text = query.toLowerCase();
  const flags = lowFitTerms.filter((term) => text.includes(term)).map((term) => `Potentially off-positioning: ${term}`);
  if (text.includes("tool")) {
    flags.push("Query may imply a self-serve software tool; position Adblume as an AI-assisted service, not SaaS.");
  }
  return flags;
}

function heuristicCompetitors(query: string) {
  const text = query.toLowerCase();
  if (text.includes("soona")) return ["Soona", "Squareshot", "ProductPhoto.com"];
  if (includesAny(text, ["ai", "tool", "retouching"])) return ["Soona", "Shhots AI", "Scalio"];
  if (includesAny(text, ["catalog", "ecommerce", "shopify"])) return ["Squareshot", "Pixelz", "ProductPhoto.com"];
  if (includesAny(text, ["luxury", "fine jewelry", "video", "campaign"])) return ["ESPOSTUDIO", "Studio Nula", "Pro Photo Studio"];
  return competitors.slice(0, 3);
}

function brandDomainsFor(brandNames: string[]) {
  const normalized = new Set(brandNames.map((name) => name.toLowerCase()));
  return brands
    .filter((brand) => normalized.has(brand.name.toLowerCase()))
    .flatMap((brand) => brand.domains);
}

function measuredSourcesFor(competitorRows: BrandReportRow[]) {
  const competitorNames = competitorRows.map((row) => row.brandName);
  const competitorDomains = new Set(brandDomainsFor(competitorNames));
  const citedDomains = domainReportRows
    .filter((row) => competitorDomains.has(row.domain) || row.classification === "UGC")
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 4)
    .map((row) => row.domain);
  const sourceUrls = urlReportRows
    .filter((row) => {
      try {
        return competitorDomains.has(new URL(row.url).hostname.replace(/^www\./, ""));
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 4)
    .map((row) => row.url);

  return { citedDomains, sourceUrls };
}

function buildGap(
  id: string,
  query: string,
  topicName: string,
  gapState: QueryGap["gapState"],
  promptId?: string,
  measured?: {
    own?: BrandReportRow;
    competitors: BrandReportRow[];
  },
): QueryGap {
  const text = query.toLowerCase();
  const winningCompetitors = measured?.competitors
    .filter((row) => row.visibility > 0)
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 5)
    .map((row) => ({
      brand: row.brandName,
      visibility: row.visibility,
      mentionCount: row.mentionCount,
      position: row.position,
    }));
  const ownVisibility = measured?.own?.visibility;
  const competitorVisibility = winningCompetitors?.[0]?.visibility;
  const visibilityGap =
    ownVisibility !== undefined && competitorVisibility !== undefined
      ? Math.max(0, competitorVisibility - ownVisibility)
      : undefined;
  const intentScore = scoreByTerms(text, ["best", "studio", "service", "partner", "pricing", "hire"], 22, 12);
  const sentimentFitScore = Math.max(12, scoreByTerms(text, positiveFitTerms, 18, 8) - riskFlags(query).length * 24);
  const competitorPressureScore = Math.min(
    100,
    scoreByTerms(text, ["vs", "alternatives", "compare", "best", "tool", "studio"], 12, 12) +
      Math.round((competitorVisibility ?? 0) * 45),
  );
  const adblumeFitScore = scoreByTerms(text, ["jewelry", "fine jewelry", "luxury", "ai", "video", "catalog", "ecommerce"], 20, 10);
  const contentGapScore = Math.min(
    100,
    scoreByTerms(text, ["pricing", "alternatives", "vs", "best", "service", "studio", "tool"], 18, 10) +
      Math.round((visibilityGap ?? 0) * 65),
  );
  const gapStateBonus =
    gapState === "measured_gap" ? Math.round((visibilityGap ?? 0) * 32) : gapState === "untracked_opportunity" ? 10 : 4;
  const riskPenalty = riskFlags(query).length * 18;
  const totalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (intentScore + sentimentFitScore + competitorPressureScore + adblumeFitScore + contentGapScore) / 5 +
          gapStateBonus -
          riskPenalty,
      ),
    ),
  );
  const sources = measured ? measuredSourcesFor(measured.competitors) : undefined;

  return {
    id,
    query,
    promptId,
    topicName,
    customerIntent: classifyIntent(query),
    funnelStage: classifyFunnel(query),
    gapState,
    intentScore,
    sentimentFitScore,
    competitorPressureScore,
    adblumeFitScore,
    contentGapScore,
    totalScore,
    scoreLabel: totalScore >= 78 ? "High" : totalScore >= 58 ? "Medium" : "Low",
    likelyCompetitors: winningCompetitors?.length
      ? winningCompetitors.map((competitor) => competitor.brand)
      : heuristicCompetitors(query),
    alignedPropositions: alignedPropositions(query),
    riskFlags: riskFlags(query),
    approvalStatus: totalScore >= 78 ? "approved" : "pending",
    recommendedAction: routeAction(query),
    ownVisibility,
    competitorVisibility,
    visibilityGap,
    mentionCount: measured?.own?.mentionCount,
    sentiment: measured?.own?.sentiment,
    position: measured?.own?.position,
    citedDomains: sources?.citedDomains,
    sourceUrls: sources?.sourceUrls,
    winningCompetitors,
  };
}

function topicNameForPrompt(prompt: Prompt) {
  return topics.find((topic) => topic.id === prompt.topicId)?.name ?? "Uncategorized";
}

export function getQueryGaps() {
  const ownBrand = brands.find((brand) => brand.isOwn);
  const tracked = prompts.map((prompt) => {
    const rows = brandReportRows.filter((row) => row.promptId === prompt.id);
    const own = rows.find((row) => row.brandId === ownBrand?.id);
    const competitorRows = rows.filter((row) => row.brandId !== ownBrand?.id);
    return buildGap(
      `gap-${prompt.id}`,
      prompt.text,
      topicNameForPrompt(prompt),
      rows.length ? "measured_gap" : "tracked_pending",
      prompt.id,
      rows.length ? { own, competitors: competitorRows } : undefined,
    );
  });
  const untracked = untrackedQueries.map((query) =>
    buildGap(query.id, query.query, query.topicName, "untracked_opportunity"),
  );
  return [...tracked, ...untracked].sort((a, b) => b.totalScore - a.totalScore);
}

export function summarizeByIntent(gaps: QueryGap[]) {
  return Object.values(
    gaps.reduce<Record<string, { intent: QueryGap["customerIntent"]; count: number; score: number; approved: number }>>(
      (summary, gap) => {
        const current = summary[gap.customerIntent] ?? {
          intent: gap.customerIntent,
          count: 0,
          score: 0,
          approved: 0,
        };
        current.count += 1;
        current.score += gap.totalScore;
        if (gap.approvalStatus === "approved") current.approved += 1;
        summary[gap.customerIntent] = current;
        return summary;
      },
      {},
    ),
  )
    .map((item) => ({ ...item, averageScore: Math.round(item.score / item.count) }))
    .sort((a, b) => b.averageScore - a.averageScore);
}
