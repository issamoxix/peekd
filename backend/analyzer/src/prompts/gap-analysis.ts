import type { BrandBrief } from "shared";
import type { PeecData } from "../services/claude.js";

export const GAP_ANALYSIS_SYSTEM = `You are a Generative Engine Optimization (GEO) strategist. Analyze the gap between how LLMs currently describe a brand and how the brand wants to be described.

You must respond with valid JSON only. No markdown, no explanations, just JSON.

The JSON must have this exact structure:
{
  "currentStateSummary": "string - 2-3 sentences describing how LLMs currently describe the brand",
  "targetState": "string - 2-3 sentences describing how the brand wants to be described",
  "gaps": [
    {
      "id": "gap-1",
      "description": "string - what is missing or wrong",
      "severity": "High" | "Medium" | "Low",
      "currentClaim": "string - what LLMs currently say",
      "desiredClaim": "string - what brand wants them to say",
      "rationale": "string - why this matters"
    }
  ],
  "citationSources": [
    {
      "domain": "string - domain name",
      "trustSignal": "string - why LLMs trust this source",
      "mentionCount": number
    }
  ]
}`;

export function formatGapAnalysisPrompt(brandBrief: BrandBrief, peecData: PeecData): string {
  return `Analyze the gap between current LLM descriptions and desired brand positioning.

## Brand Brief
- Brand Name: ${brandBrief.brandName}
- Domain: ${brandBrief.domain}
- Category: ${brandBrief.category}
- Desired Tone: ${brandBrief.desiredTone}
- Desired Claims:
${brandBrief.desiredClaims.map((c) => `  - ${c}`).join("\n")}
- Key Differentiators:
${brandBrief.keyDifferentiators.map((d) => `  - ${d}`).join("\n")}
- Competitors: ${brandBrief.competitors.join(", ")}

## Current LLM Data from Peec AI

### Brand Report
${JSON.stringify(peecData.brandReport, null, 2)}

### Domain Report (Citation Sources)
${JSON.stringify(peecData.domainReport, null, 2)}

### Recent AI Chat Samples
${JSON.stringify(peecData.chats.slice(0, 5), null, 2)}

### Search Queries That Trigger Brand Mentions
${JSON.stringify(peecData.searchQueries, null, 2)}

Analyze the gap and return JSON only.`;
}
