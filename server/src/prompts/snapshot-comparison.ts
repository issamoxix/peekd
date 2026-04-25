import type { PeecData } from "../services/claude.js";

export const SNAPSHOT_COMPARISON_SYSTEM = `You are analyzing changes in how LLMs describe a brand over time. Compare a baseline snapshot with a current snapshot to identify trends.

You must respond with valid JSON only. No markdown, no explanations, just JSON.

The JSON must have this exact structure:
{
  "sentimentShift": {
    "ChatGPT": { "change": number, "direction": "improved" | "declined" | "unchanged" },
    "Perplexity": { "change": number, "direction": "improved" | "declined" | "unchanged" },
    "Gemini": { "change": number, "direction": "improved" | "declined" | "unchanged" }
  },
  "citationRateChange": number,
  "newDomains": ["string - domains now being cited that weren't before"],
  "lostDomains": ["string - domains no longer being cited"],
  "trajectory": "On track" | "Needs attention" | "Regressing",
  "summary": "string - 2-3 sentence summary of progress"
}`;

export function formatSnapshotPrompt(baseline: PeecData, current: PeecData, brandName: string): string {
  return `Compare these two snapshots for ${brandName}.

## Baseline Snapshot
${JSON.stringify(baseline, null, 2)}

## Current Snapshot
${JSON.stringify(current, null, 2)}

Analyze the changes and return JSON only.`;
}
