import type { GapAnalysis, GapAnalysisGap, CitationSource } from "shared";
import { Card } from "../ui";

interface GapResultsProps {
  analysis: GapAnalysis;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleString();
  } catch {
    return dateStr;
  }
}

function SeverityBadge({ severity }: { severity: GapAnalysisGap["severity"] }) {
  const colors = {
    High: "bg-red-100 text-red-800 border-red-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    Low: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[severity]}`}
    >
      {severity}
    </span>
  );
}

function GapItem({ gap }: { gap: GapAnalysisGap }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">{gap.description}</p>
        <SeverityBadge severity={gap.severity} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Current Claim
          </p>
          <p className="text-gray-700">{gap.currentClaim || "Not mentioned"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Desired Claim
          </p>
          <p className="text-gray-700">{gap.desiredClaim}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Rationale
        </p>
        <p className="text-sm text-gray-600">{gap.rationale}</p>
      </div>
    </div>
  );
}

function CitationSourcesTable({ sources }: { sources: CitationSource[] }) {
  if (!sources || sources.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No citation sources found
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Domain
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trust Signal
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mentions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sources.map((source) => (
            <tr key={source.domain}>
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                {source.domain}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {source.trustSignal}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                {source.mentionCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GapResults({ analysis }: GapResultsProps) {
  const highSeverityCount = analysis.gaps.filter((g) => g.severity === "High").length;
  const mediumSeverityCount = analysis.gaps.filter((g) => g.severity === "Medium").length;
  const lowSeverityCount = analysis.gaps.filter((g) => g.severity === "Low").length;

  return (
    <div className="space-y-6">
      {/* Current State Summary */}
      <Card title="Current State">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {analysis.currentStateSummary}
        </p>
      </Card>

      {/* Target State */}
      <Card title="Target State">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {analysis.targetState}
        </p>
      </Card>

      {/* Gaps */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Identified Gaps</span>
            <div className="flex items-center gap-3 text-xs">
              {highSeverityCount > 0 && (
                <span className="text-red-600">{highSeverityCount} High</span>
              )}
              {mediumSeverityCount > 0 && (
                <span className="text-amber-600">{mediumSeverityCount} Medium</span>
              )}
              {lowSeverityCount > 0 && (
                <span className="text-green-600">{lowSeverityCount} Low</span>
              )}
            </div>
          </div>
        }
      >
        {analysis.gaps.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No gaps identified. Your brand messaging aligns with LLM responses.
          </p>
        ) : (
          <div className="space-y-4">
            {analysis.gaps.map((gap) => (
              <GapItem key={gap.id} gap={gap} />
            ))}
          </div>
        )}
      </Card>

      {/* Citation Sources */}
      <Card title="Citation Sources">
        <CitationSourcesTable sources={analysis.citationSources} />
      </Card>

      {/* Metadata */}
      <p className="text-xs text-gray-400 text-center">
        Analysis completed on {formatDate(analysis.createdAt)}
      </p>
    </div>
  );
}
