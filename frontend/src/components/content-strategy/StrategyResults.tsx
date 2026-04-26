import { useState } from "react";
import type { ContentStrategy } from "shared";
import { Card } from "../ui";

interface StrategyResultsProps {
  strategy: ContentStrategy;
  onToggleQuickWin: (id: string, completed: boolean) => void;
}

type TabKey = "articles" | "structuredData" | "prAngles" | "quickWins";

export function StrategyResults({ strategy, onToggleQuickWin }: StrategyResultsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("quickWins");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "quickWins", label: "Quick Wins", count: strategy.quickWins.length },
    { key: "articles", label: "Articles", count: strategy.articles.length },
    { key: "structuredData", label: "Schema", count: strategy.structuredData.length },
    { key: "prAngles", label: "PR Angles", count: strategy.prAngles.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-teal text-teal"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "quickWins" && (
          <QuickWinsPanel quickWins={strategy.quickWins} onToggle={onToggleQuickWin} />
        )}
        {activeTab === "articles" && <ArticlesPanel articles={strategy.articles} />}
        {activeTab === "structuredData" && (
          <StructuredDataPanel structuredData={strategy.structuredData} />
        )}
        {activeTab === "prAngles" && <PRAnglesPanel prAngles={strategy.prAngles} />}
      </div>
    </div>
  );
}

function QuickWinsPanel({
  quickWins,
  onToggle,
}: {
  quickWins: ContentStrategy["quickWins"];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const completedCount = quickWins.filter((qw) => qw.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {completedCount} of {quickWins.length} completed
        </p>
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / quickWins.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {quickWins.map((qw) => (
          <label
            key={qw.id}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              qw.completed
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200 hover:border-teal"
            }`}
          >
            <input
              type="checkbox"
              checked={qw.completed}
              onChange={(e) => onToggle(qw.id, e.target.checked)}
              className="mt-1 h-4 w-4 text-teal border-gray-300 rounded focus:ring-teal"
            />
            <span
              className={`text-sm ${qw.completed ? "text-gray-500 line-through" : "text-gray-700"}`}
            >
              {qw.description}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ArticlesPanel({ articles }: { articles: ContentStrategy["articles"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <Card key={article.id}>
          <div
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{article.title}</h4>
                <p className="text-sm text-gray-500 mt-1">Target: "{article.targetQuery}"</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{article.schemaType}</span>
                <span className="text-xs text-gray-500">{article.wordCount} words</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedId === article.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {expandedId === article.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Key Claims</p>
                  <ul className="mt-1 space-y-1">
                    {article.keyClaims.map((claim, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-teal">•</span>
                        {claim}
                      </li>
                    ))}
                  </ul>
                </div>
                {article.internalLinkingTargets.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Internal Links</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {article.internalLinkingTargets.map((target, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function StructuredDataPanel({ structuredData }: { structuredData: ContentStrategy["structuredData"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {structuredData.map((schema) => (
        <Card key={schema.id}>
          <div
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === schema.id ? null : schema.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{schema.schemaType}</h4>
                <p className="text-sm text-gray-500 mt-1">{schema.purpose}</p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedId === schema.id ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {expandedId === schema.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Gap Addressed</p>
                  <p className="text-sm text-gray-700 mt-1">{schema.gapAddressed}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">JSON-LD</p>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {schema.jsonLd}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PRAnglesPanel({ prAngles }: { prAngles: ContentStrategy["prAngles"] }) {
  return (
    <div className="space-y-3">
      {prAngles.map((angle) => (
        <Card key={angle.id}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-gray-900">{angle.headline}</h4>
              <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                {angle.publicationType}
              </span>
            </div>
            <p className="text-sm text-gray-600">{angle.hook}</p>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">Data point:</span>{" "}
                <span className="text-gray-700">{angle.keyDataPoint}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Supports claim:</span>{" "}
              <span className="text-xs text-teal">{angle.targetClaim}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
