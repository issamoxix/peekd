import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader, AlertCircle, Tag, ChevronRight } from "lucide-react";
import { useCurrentSelection } from "../hooks/useCurrentSelection";

const API = "/agents-api";

type UseCase = "general" | "sentiment_flip" | "source_infiltration" | "gap_analysis" | "brand_analyzer";

const USE_CASES: { id: UseCase; label: string; description: string }[] = [
  {
    id: "general",
    label: "General Tracking",
    description: "Balanced visibility across the buyer journey.",
  },
  {
    id: "sentiment_flip",
    label: "Sentiment Flip",
    description: "Surface negative-sentiment + reputation-risk queries.",
  },
  {
    id: "source_infiltration",
    label: "Source Infiltration",
    description: "Queries that AI tends to answer with third-party citations.",
  },
  {
    id: "gap_analysis",
    label: "Gap Analysis",
    description: "Probes whether the brand is mentioned at all in its category.",
  },
  {
    id: "brand_analyzer",
    label: "Brand Analyzer",
    description: "Probes brand perception, positioning, audience, differentiators.",
  },
];

type Recommendation = {
  text: string;
  category: "discovery" | "comparison" | "buyer_intent" | "use_case" | "defense";
  topic: string;
  rationale: string;
};

type SubmitResult = {
  text: string;
  topic?: string;
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
};

const CATEGORY_COLOR: Record<Recommendation["category"], string> = {
  discovery: "bg-sage-soft text-sage",
  comparison: "bg-amber-soft text-amber",
  buyer_intent: "bg-pearl text-graphite",
  use_case: "bg-sage-soft text-sage",
  defense: "bg-amber-soft text-amber",
};

interface Row extends Recommendation {
  selected: boolean;
}

export default function PromptStudio() {
  const { projectId, brandId, brandName, isConfigured } = useCurrentSelection();
  const [useCase, setUseCase] = useState<UseCase>("general");
  const [count, setCount] = useState(12);
  const [country, setCountry] = useState("US");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SubmitResult[] | null>(null);

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const useCaseMeta = USE_CASES.find((u) => u.id === useCase)!;

  if (!isConfigured) {
    return (
      <div className="rounded-2xl border border-amber bg-amber-soft p-8 text-center">
        <h2 className="text-lg font-semibold text-ink mb-2">No project or brand selected</h2>
        <p className="text-muted mb-4">
          Pick a Peec project + brand on the Settings page first — recommendations need a brand to scrape.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-graphite transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setResults(null);
    setRows([]);
    try {
      const r = await fetch(`${API}/agents/recommend-prompts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          brand_id: brandId,
          count,
          use_case: useCase,
        }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const data: { recommendations: Recommendation[] } = await r.json();
      setRows(data.recommendations.map((rec) => ({ ...rec, selected: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    const items = rows
      .filter((r) => r.selected && r.text.trim())
      .map((r) => ({ text: r.text.trim(), topic: r.topic.trim() || undefined }));
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResults(null);
    try {
      const r = await fetch(`${API}/prompts/batch-with-topics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, items, country_code: country }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const data: { results: SubmitResult[] } = await r.json();
      setResults(data.results);
      // remove successfully created from the list
      const okSet = new Set(data.results.filter((x) => x.ok).map((x) => x.text));
      setRows((prev) => prev.filter((row) => !okSet.has(row.text)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function patchRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-pearl px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sage mb-3">
          <Sparkles className="w-3 h-3" />
          Prompt Studio
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Recommend tracking prompts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Generate prompts tailored to a Peekd feature, review and tweak topics, then add them to Peec in
          one click. Currently scoped to brand{" "}
          <span className="font-semibold text-ink">{brandName || "—"}</span>.
        </p>
      </header>

      {/* Controls */}
      <section className="rounded-xl border border-line bg-panel p-5 shadow-paper space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
              Use case
            </label>
            <select
              value={useCase}
              onChange={(e) => setUseCase(e.target.value as UseCase)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {USE_CASES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">{useCaseMeta.description}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
              Count
            </label>
            <input
              type="number"
              min={3}
              max={25}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
              Country
            </label>
            <input
              type="text"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-mono uppercase text-ink"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={generate}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-graphite transition-colors disabled:opacity-50"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating…" : "Recommend"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red bg-red-soft px-3 py-2 text-sm text-graphite">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red flex-shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}
      </section>

      {/* Recommendations list */}
      {rows.length > 0 && (
        <section className="rounded-xl border border-line bg-panel p-5 shadow-paper space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">
              {rows.length} suggestions ·{" "}
              <span className="text-sage">{selectedCount} selected</span>
            </h2>
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: true })))}
                className="text-muted hover:text-ink"
              >
                Select all
              </button>
              <span className="text-line">·</span>
              <button
                onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: false })))}
                className="text-muted hover:text-ink"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {rows.map((row, idx) => (
              <li
                key={idx}
                className={`rounded-lg border p-3 transition-colors ${
                  row.selected ? "border-sage bg-sage-soft/40" : "border-line bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => patchRow(idx, { selected: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-sage"
                  />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${CATEGORY_COLOR[row.category]}`}
                      >
                        {row.category.replace("_", " ")}
                      </span>
                      <input
                        type="text"
                        value={row.text}
                        onChange={(e) => patchRow(idx, { text: e.target.value })}
                        className="flex-1 min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink hover:border-line focus:border-sage focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Tag className="w-3 h-3 text-muted flex-shrink-0" />
                      <span className="text-muted">Topic:</span>
                      <input
                        type="text"
                        value={row.topic}
                        onChange={(e) => patchRow(idx, { topic: e.target.value })}
                        placeholder="(no topic)"
                        className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium text-graphite hover:border-line focus:border-sage focus:bg-white focus:outline-none"
                      />
                      <span className="text-line">·</span>
                      <span className="text-muted italic truncate">{row.rationale}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t border-soft-line">
            <p className="text-xs text-muted">
              Topics are created in Peec on submit if they don't exist yet.
            </p>
            <button
              onClick={submit}
              disabled={submitting || selectedCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-sage px-5 py-2.5 text-sm font-semibold text-white hover:bg-graphite transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {submitting ? "Adding…" : `Add ${selectedCount} prompt${selectedCount === 1 ? "" : "s"} to Peec`}
            </button>
          </div>
        </section>
      )}

      {/* Results */}
      {results && (
        <section className="rounded-xl border border-line bg-panel p-5 shadow-paper">
          <h2 className="text-lg font-semibold text-ink mb-3">
            Created{" "}
            <span className="text-sage">{results.filter((r) => r.ok).length}</span> /{" "}
            {results.length} prompts
            {results.some((r) => !r.ok) && (
              <span className="text-red"> · {results.filter((r) => !r.ok).length} failed</span>
            )}
          </h2>
          {results.some((r) => !r.ok) && (
            <ul className="space-y-1 text-xs">
              {results
                .filter((r) => !r.ok)
                .map((r, i) => (
                  <li key={i} className="font-mono text-red break-all">
                    {r.status} — {r.text.slice(0, 120)}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
