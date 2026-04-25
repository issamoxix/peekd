import type { BrandBrief } from "shared";
import type { GapAnalysisResult } from "../services/claude.js";

export const CONTENT_STRATEGY_SYSTEM = `You are a GEO content strategist. Generate a structured content strategy to shift how LLMs describe a brand. Focus on content types that LLMs cite: authoritative articles, structured data, earned media.

You must respond with valid JSON only. No markdown, no explanations, just JSON.

The JSON must have this exact structure:
{
  "articles": [
    {
      "id": "article-1",
      "title": "string",
      "targetQuery": "string - the query this article should rank for",
      "keyClaims": ["string"],
      "wordCount": number,
      "internalLinkingTargets": ["string"],
      "schemaType": "Article" | "HowTo" | "FAQ" | "Product"
    }
  ],
  "structuredData": [
    {
      "id": "schema-1",
      "schemaType": "string - Schema.org type",
      "purpose": "string",
      "gapAddressed": "string - which gap this fixes",
      "jsonLd": "string - valid JSON-LD code"
    }
  ],
  "prAngles": [
    {
      "id": "pr-1",
      "headline": "string",
      "publicationType": "string - e.g., industry blog, news site",
      "hook": "string - the angle",
      "keyDataPoint": "string",
      "targetClaim": "string - which brand claim this supports"
    }
  ],
  "quickWins": [
    {
      "id": "qw-1",
      "description": "string - action that can be done in <1 week",
      "completed": false
    }
  ]
}

Generate 5 articles, 3 structured data templates, 5 PR angles, and 3 quick wins.`;

export function formatStrategyPrompt(brandBrief: BrandBrief, gapAnalysis: GapAnalysisResult): string {
  return `Generate a content strategy to close these brand perception gaps.

## Brand Brief
- Brand Name: ${brandBrief.brandName}
- Domain: ${brandBrief.domain}
- Category: ${brandBrief.category}
- Desired Tone: ${brandBrief.desiredTone}
- Desired Claims:
${brandBrief.desiredClaims.map((c) => `  - ${c}`).join("\n")}

## Gap Analysis Results

### Current State
${gapAnalysis.currentStateSummary}

### Target State
${gapAnalysis.targetState}

### Gaps to Close
${gapAnalysis.gaps.map((g) => `- [${g.severity}] ${g.description}: "${g.currentClaim}" → "${g.desiredClaim}"`).join("\n")}

### Currently Cited Sources
${gapAnalysis.citationSources.map((s) => `- ${s.domain} (${s.mentionCount} mentions, ${s.trustSignal})`).join("\n")}

Generate a comprehensive content strategy. Return JSON only.`;
}
