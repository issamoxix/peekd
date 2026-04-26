import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentSelection } from "../hooks/useCurrentSelection";

const API = "/agents-api";

type Recommendation = {
  text: string;
  category: "discovery" | "comparison" | "buyer_intent" | "use_case" | "defense";
  rationale: string;
};

type CreatePromptResult = {
  text: string;
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
};

type Source = { url: string; domain: string; citationCount: number; citationPosition: number };

type Finding = {
  chat_id: string;
  prompt_id: string;
  model_channel_id: string;
  brand_name: string;
  claims: string[];
  response_excerpt: string;
  sources: Source[];
};

type Plan = {
  chat_id: string;
  brand_name: string;
  claim: string;
  source_url: string;
  plan: {
    claim: string;
    source_assessment: { supports_claim: "yes" | "partial" | "no"; key_quotes: string[]; factual_errors: string[] };
    rebuttal: string;
    pr_pitch: { target: string; angle: string; draft_email: string };
    new_content: { format: string; title: string; outline: string[] }[];
  };
};

type Report = { scanned_chats: number; findings: Finding[]; plans: Plan[] };

type InfiltrationTarget = {
  url: string;
  domain: string;
  title: string | null;
  classification: string | null;
  citation_count: number;
  retrieval_count: number;
  citation_rate: number;
  competitors_present: string[];
  leverage_score: number;
};

type InfiltrationPlanBody = {
  outreach_type:
    | "guest_post"
    | "product_review"
    | "partnership"
    | "press_pitch"
    | "community_engagement"
    | "data_contribution"
    | "comment_or_correction";
  why_strategic: string;
  target_contact: string;
  angle: string;
  draft_outreach: string;
  alternatives: string[];
  effort: "low" | "medium" | "high";
  expected_impact: "low" | "medium" | "high";
};

type InfiltrationPlanEntry = { target: InfiltrationTarget; plan: InfiltrationPlanBody };

type CitationGraphNode = {
  domain: string;
  url_count: number;
  citation_count: number;
  classification: string | null;
};

type InfiltrationReport = {
  brand_id: string;
  brand_name: string;
  own_domains: string[];
  date_range: { start: string; end: string };
  total_urls_scanned: number;
  citation_graph: CitationGraphNode[];
  targets: InfiltrationTarget[];
  plans: InfiltrationPlanEntry[];
};

type Tab = "prompts" | "sentiment-flip" | "infiltration";

const CATEGORY_COLOR: Record<Recommendation["category"], string> = {
  discovery: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  comparison: "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30",
  buyer_intent: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  use_case: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  defense: "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30",
};

const TABS: { id: Tab; label: string; icon: string; hint: string }[] = [
  { id: "prompts", label: "Tracking Prompts", icon: "✦", hint: "Seed" },
  { id: "sentiment-flip", label: "Sentiment Flip", icon: "◈", hint: "Defend" },
  { id: "infiltration", label: "Source Infiltration", icon: "◉", hint: "Expand" },
];

export default function Agents() {
  const { projectId, brandId, brandName, isConfigured } = useCurrentSelection();
  const [tab, setTab] = useState<Tab>("prompts");

  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <Hero />
        <div className="rounded-2xl border border-amber bg-amber-soft p-8 text-center">
          <h2 className="text-lg font-semibold text-ink mb-2">No project or brand selected</h2>
          <p className="text-muted mb-4">
            The agents need a Peec project and brand to run against. Pick them on the Settings page first.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-graphite transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-zinc-100 space-y-8">
      <Hero brandName={brandName} />

      <TabBar tab={tab} setTab={setTab} />

      <div>
        {tab === "prompts" && <PromptRecommender projectId={projectId} brandId={brandId} onPromptsAdded={() => {}} />}
        {tab === "sentiment-flip" && <AgentRunner projectId={projectId} brandId={brandId} />}
        {tab === "infiltration" && <SourceInfiltration projectId={projectId} brandId={brandId} />}
      </div>
    </div>
  );
}

function Hero({ brandName }: { brandName?: string }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-line card-surface px-6 py-8 sm:px-10 sm:py-12">
      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-pearl px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sage">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          competitive war room
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
          <span className="gradient-text">Peec AI Agents</span>
        </h1>
        <p className="max-w-2xl text-sm sm:text-[15px] leading-relaxed text-muted">
          Seed tracking prompts, scan AI responses for negative brand mentions, and run a daily competitive war
          room with live alerts.
          {brandName && <> Currently focused on <span className="text-ink font-semibold">{brandName}</span>.</>}
        </p>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav>
      <div className="rounded-xl border border-white/10 card-surface p-1.5 flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group relative flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ring-focus ${
                active ? "text-white shadow-[0_8px_20px_-10px_rgba(99,102,241,0.6)]" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-indigo-500/30 ring-1 ring-inset ring-white/15" />
              )}
              <span className="relative flex items-center gap-2">
                <span className={`text-[13px] ${active ? "text-violet-200" : "text-zinc-500"}`}>{t.icon}</span>
                <span>{t.label}</span>
                <span
                  className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                    active ? "bg-white/10 text-zinc-200" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {t.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col text-[11px] uppercase tracking-wider font-medium text-zinc-500">
      {label}
      {children}
    </label>
  );
}

function SectionHeader({
  step,
  title,
  hint,
  accent,
  right,
}: {
  step?: string;
  title: string;
  hint?: string;
  accent: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {step && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${accent}`}>
            {step}
          </div>
        )}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
          {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

function PromptRecommender({
  projectId,
  brandId,
  onPromptsAdded,
}: {
  projectId: string;
  brandId: string;
  onPromptsAdded: () => void;
}) {
  const [count, setCount] = useState(10);
  const [country, setCountry] = useState("US");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatePromptResult[] | null>(null);

  const customLines = useMemo(
    () =>
      custom
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    [custom]
  );
  const totalToAdd = selected.size + customLines.length;

  async function generate() {
    if (!brandId || !projectId) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const r = await fetch(`${API}/agents/recommend-prompts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, brand_id: brandId, count }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const data: { recommendations: Recommendation[] } = await r.json();
      setRecs(data.recommendations);
      setSelected(new Set(data.recommendations.map((x) => x.text)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    const texts = [...recs.filter((r) => selected.has(r.text)).map((r) => r.text), ...customLines];
    if (texts.length === 0) return;
    setAdding(true);
    setError(null);
    setResults(null);
    try {
      const r = await fetch(`${API}/prompts/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, texts, country_code: country }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const data: { results: CreatePromptResult[] } = await r.json();
      setResults(data.results);
      setSelected(new Set());
      setCustom("");
      setRecs([]);
      onPromptsAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  function toggle(text: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 card-surface p-5 sm:p-6 space-y-5">
      <SectionHeader
        step="1"
        title="Add tracking prompts"
        hint="Recommend → review → add to Peec"
        accent="bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-inset ring-indigo-400/30"
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Recommendations">
          <input
            type="number"
            min={3}
            max={25}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-zinc-100"
          />
        </Field>
        <Field label="Country">
          <input
            type="text"
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="input-base mt-1 w-24 rounded-lg px-3 py-2 text-sm text-zinc-100 uppercase font-mono tracking-wider"
          />
        </Field>
        <button
          onClick={generate}
          disabled={loading || !brandId}
          className="btn-ghost rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Generating…
            </span>
          ) : (
            "Generate recommendations"
          )}
        </button>
      </div>

      {recs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              <span className="text-zinc-200 font-mono">{selected.size}</span> / {recs.length} selected
            </span>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set(recs.map((r) => r.text)))} className="hover:text-zinc-100 transition">
                Select all
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={() => setSelected(new Set())} className="hover:text-zinc-100 transition">
                Clear
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {recs.map((r) => {
              const isSelected = selected.has(r.text);
              return (
                <li
                  key={r.text}
                  className={`group rounded-xl border p-3 transition-all ${
                    isSelected ? "border-indigo-400/40 bg-indigo-500/5" : "border-white/10 card-inset hover:border-white/20"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(r.text)} className="mt-1 h-4 w-4 accent-indigo-500" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${CATEGORY_COLOR[r.category]}`}>
                          {r.category.replace("_", " ")}
                        </span>
                        <span className="text-sm text-zinc-100">{r.text}</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{r.rationale}</p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <Field label="Custom prompts (one per line)">
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            placeholder="Add your own ideas — one prompt per line"
            className="input-base mt-1 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
          />
        </Field>
        {customLines.length > 0 && (
          <p className="mt-1.5 text-xs text-zinc-500">
            {customLines.length} custom prompt{customLines.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={add}
          disabled={adding || totalToAdd === 0 || !brandId}
          className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? (
            <span className="flex items-center gap-2">
              <Spinner /> Adding…
            </span>
          ) : (
            `Add ${totalToAdd || ""} prompt${totalToAdd === 1 ? "" : "s"} to Peec`
          )}
        </button>
        {error && <ErrorPill message={error} />}
      </div>

      {results && (
        <div className="rounded-xl border border-white/10 card-inset p-4 text-sm">
          <p className="text-zinc-300 mb-2">
            Created <span className="text-emerald-400 font-mono font-medium">{results.filter((r) => r.ok).length}</span> /{" "}
            {results.length} prompts
            {results.some((r) => !r.ok) && (
              <span className="text-rose-400"> — {results.filter((r) => !r.ok).length} failed</span>
            )}
          </p>
          {results.some((r) => !r.ok) && (
            <ul className="space-y-1 text-xs">
              {results
                .filter((r) => !r.ok)
                .map((r, i) => (
                  <li key={i} className="text-rose-400 font-mono">
                    {r.status} — {r.text.slice(0, 80)}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AgentRunner({ projectId, brandId }: { projectId: string; brandId: string }) {
  const [days, setDays] = useState(120);
  const [maxChats, setMaxChats] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await fetch(`${API}/agents/sentiment-flip`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, days, max_chats: maxChats, brand_id: brandId || null }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      setReport(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 card-surface p-5 sm:p-6 space-y-5">
      <SectionHeader
        step="2"
        title="Run Sentiment Flip Agent"
        hint="Detect negative AI mentions and generate counter-content"
        accent="bg-gradient-to-br from-rose-500/30 to-amber-500/30 text-rose-200 ring-1 ring-inset ring-rose-400/30"
        right={
          report && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Stat label="chats" value={report.scanned_chats} tone="neutral" />
              <Stat label="negative" value={report.findings.length} tone="warn" />
              <Stat label="plans" value={report.plans.length} tone="success" />
            </div>
          )
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Days back">
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-zinc-100" />
        </Field>
        <Field label="Max chats">
          <input type="number" min={1} max={500} value={maxChats} onChange={(e) => setMaxChats(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-zinc-100" />
        </Field>
        <button onClick={run} disabled={loading || !brandId} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Running…
            </span>
          ) : (
            "Run agent"
          )}
        </button>
      </div>

      {error && <ErrorPill message={error} />}
      {loading && <LoadingState message="Scanning chats and generating counter-content plans. This usually takes 30-90s." />}
      {report && report.findings.length === 0 && <EmptyState title="No negative mentions found" message={`Scanned ${report.scanned_chats} chats. Either visibility is low or sentiment is healthy.`} />}
      {report && report.findings.length > 0 && (
        <div className="space-y-4">
          {report.findings.map((f) => (
            <FindingCard key={f.chat_id} finding={f} plans={report.plans.filter((p) => p.chat_id === f.chat_id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingCard({ finding, plans }: { finding: Finding; plans: Plan[] }) {
  return (
    <article className="rounded-xl border border-white/10 card-inset p-4 sm:p-5 space-y-4">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-amber-300 ring-1 ring-inset ring-amber-500/30">{finding.model_channel_id}</span>
        <span className="font-mono text-zinc-500">{finding.chat_id.slice(0, 16)}…</span>
        <span className="text-zinc-500">brand: <span className="text-zinc-200">{finding.brand_name}</span></span>
      </header>
      <div>
        <SubHeading>Negative claims</SubHeading>
        <ul className="list-disc list-inside space-y-1 text-sm text-zinc-200">
          {finding.claims.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
      <div>
        <SubHeading>Response excerpt</SubHeading>
        <pre className="whitespace-pre-wrap rounded-lg border border-white/5 bg-black/30 p-3 text-xs text-zinc-300 max-h-40 overflow-auto scrollbar-thin">{finding.response_excerpt}</pre>
      </div>
      <div>
        <SubHeading>Cited sources</SubHeading>
        <ul className="space-y-1 text-xs">
          {finding.sources.slice(0, 5).map((s, i) => (
            <li key={i} className="font-mono flex items-baseline gap-2">
              <span className="text-zinc-500 shrink-0">{s.domain}</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200 hover:underline truncate">{s.url.slice(0, 80)}</a>
            </li>
          ))}
        </ul>
      </div>
      {plans.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <SubHeading>Counter-content plans</SubHeading>
          {plans.map((p, i) => <PlanCard key={i} plan={p} />)}
        </div>
      )}
    </article>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const supports = plan.plan.source_assessment.supports_claim;
  const supportsColor =
    supports === "no"
      ? "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30"
      : supports === "partial"
      ? "text-amber-300 bg-amber-500/10 ring-amber-500/30"
      : "text-rose-300 bg-rose-500/10 ring-rose-500/30";
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4 space-y-3 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-zinc-100 italic leading-relaxed">&ldquo;{plan.claim}&rdquo;</p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-mono ring-1 ring-inset ${supportsColor}`}>source: {supports}</span>
      </div>
      <a href={plan.source_url} target="_blank" rel="noreferrer" className="block truncate text-xs font-mono text-indigo-300 hover:text-indigo-200 hover:underline">{plan.source_url}</a>
      {plan.plan.source_assessment.key_quotes.length > 0 && (
        <div>
          <SubHeading>Key quotes</SubHeading>
          <ul className="space-y-1 text-xs text-zinc-400">
            {plan.plan.source_assessment.key_quotes.map((q, i) => <li key={i}>&ldquo;{q}&rdquo;</li>)}
          </ul>
        </div>
      )}
      <div>
        <SubHeading>Rebuttal</SubHeading>
        <p className="text-zinc-200 leading-relaxed">{plan.plan.rebuttal}</p>
      </div>
      <div className="rounded-lg border border-white/5 bg-black/20 p-3 space-y-1">
        <SubHeading>PR pitch</SubHeading>
        <p className="text-zinc-300 text-sm"><span className="font-medium text-zinc-100">Target:</span> {plan.plan.pr_pitch.target}</p>
        <p className="text-zinc-300 text-sm"><span className="font-medium text-zinc-100">Angle:</span> {plan.plan.pr_pitch.angle}</p>
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200 hover:underline">Draft email ›</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md border border-white/5 bg-black/40 p-3 text-xs text-zinc-300 scrollbar-thin">{plan.plan.pr_pitch.draft_email}</pre>
        </details>
      </div>
      <div>
        <SubHeading>New content ideas</SubHeading>
        <ul className="space-y-2 text-xs text-zinc-300">
          {plan.plan.new_content.map((c, i) => (
            <li key={i} className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-zinc-100 font-medium">{c.title} <span className="font-normal text-zinc-500">— {c.format}</span></div>
              <ul className="mt-1.5 list-disc list-inside text-zinc-400 space-y-0.5">
                {c.outline.map((o, j) => <li key={j}>{o}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const OUTREACH_COLOR: Record<InfiltrationPlanBody["outreach_type"], string> = {
  guest_post: "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30",
  product_review: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  partnership: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  press_pitch: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  community_engagement: "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30",
  data_contribution: "bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
  comment_or_correction: "bg-zinc-500/15 text-zinc-300 ring-1 ring-inset ring-zinc-500/30",
};

function SourceInfiltration({ projectId, brandId }: { projectId: string; brandId: string }) {
  const [days, setDays] = useState(90);
  const [maxTargets, setMaxTargets] = useState(6);
  const [excludeDomains, setExcludeDomains] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InfiltrationReport | null>(null);

  const excludeList = useMemo(
    () =>
      excludeDomains
        .split(/[\s,]+/)
        .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
        .filter(Boolean),
    [excludeDomains]
  );

  async function run() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await fetch(`${API}/agents/source-infiltration`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, days, max_targets: maxTargets, brand_id: brandId || null, exclude_domains: excludeList }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      setReport(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function blockDomain(domain: string) {
    if (excludeList.includes(domain)) return;
    setExcludeDomains((prev) => (prev.trim() ? `${prev.trim()}, ${domain}` : domain));
  }

  return (
    <section className="rounded-2xl border border-white/10 card-surface p-5 sm:p-6 space-y-5">
      <SectionHeader
        title="Source Infiltration Planner"
        hint="Find high-leverage citation gaps and generate outreach plans"
        accent="bg-gradient-to-br from-sky-500/30 to-cyan-500/30 text-sky-200 ring-1 ring-inset ring-sky-400/30"
        right={
          report && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Stat label="URLs" value={report.total_urls_scanned} tone="neutral" />
              <Stat label="targets" value={report.targets.length} tone="warn" />
              <Stat label="plans" value={report.plans.length} tone="success" />
            </div>
          )
        }
      />
      <p className="text-sm text-zinc-400 leading-relaxed">
        Maps which domains LLMs trust most in your category, finds the highest-leverage URLs where your brand is absent, and generates outreach plans to get included.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Days back">
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-zinc-100" />
        </Field>
        <Field label="Max targets">
          <input type="number" min={1} max={20} value={maxTargets} onChange={(e) => setMaxTargets(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-zinc-100" />
        </Field>
        <button onClick={run} disabled={loading || !brandId} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Mapping…
            </span>
          ) : (
            "Map citation graph"
          )}
        </button>
      </div>
      <Field label="Exclude domains (comma- or space-separated)">
        <input type="text" value={excludeDomains} onChange={(e) => setExcludeDomains(e.target.value)} placeholder="traini.app, sarama.ai" className="input-base mt-1 w-full rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono" />
      </Field>
      {excludeList.length > 0 && (
        <div className="-mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">blocking {excludeList.length}:</span>
          {excludeList.map((d) => (
            <span key={d} className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono text-rose-300 ring-1 ring-inset ring-rose-500/30">{d}</span>
          ))}
        </div>
      )}
      {error && <ErrorPill message={error} />}
      {loading && <LoadingState message="Pulling URL & domain reports, scoring infiltration leverage, and drafting outreach plans. Usually 30-90s." />}
      {report && (
        <>
          <CitationGraphCard nodes={report.citation_graph} />
          {report.targets.length === 0 && <EmptyState title="No infiltration targets surfaced" message="Either your brand is already cited everywhere, or there are no high-leverage gaps in this window." />}
          <div className="space-y-4">
            {report.plans.map((entry) => (
              <InfiltrationCard key={entry.target.url} entry={entry} onBlock={() => blockDomain(entry.target.domain)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CitationGraphCard({ nodes }: { nodes: CitationGraphNode[] }) {
  const top = nodes.slice(0, 10);
  const max = Math.max(1, ...top.map((n) => n.citation_count));
  return (
    <div className="rounded-xl border border-white/10 card-inset p-4">
      <SubHeading>Top cited domains in your category</SubHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
        {top.map((n) => {
          const pct = (n.citation_count / max) * 100;
          return (
            <div key={n.domain} className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-zinc-400 w-10 text-right shrink-0">{n.citation_count}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-zinc-200 font-mono truncate">{n.domain}</span>
                  {n.classification && <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">{n.classification}</span>}
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfiltrationCard({ entry, onBlock }: { entry: InfiltrationPlanEntry; onBlock: () => void }) {
  const { target, plan } = entry;
  return (
    <article className="rounded-xl border border-white/10 card-inset p-5 space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-2 py-0.5 font-mono text-amber-300 ring-1 ring-inset ring-amber-500/30">⚡ score {target.leverage_score}</span>
          {target.classification && <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-zinc-300 ring-1 ring-inset ring-white/10">{target.classification}</span>}
          <span className={`rounded-md px-2 py-0.5 font-mono uppercase tracking-wider ${OUTREACH_COLOR[plan.outreach_type]}`}>{plan.outreach_type.replace("_", " ")}</span>
          <Pill label="effort" value={plan.effort} />
          <Pill label="impact" value={plan.expected_impact} />
          <button onClick={onBlock} title="Mark as competitor and exclude from future runs" className="ml-auto rounded-md border border-white/10 px-2.5 py-0.5 text-xs text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/40 transition">⊘ Block {target.domain}</button>
        </div>
        <div>
          <a href={target.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:text-indigo-200 hover:underline break-all">{target.url}</a>
          {target.title && <p className="text-xs text-zinc-400 mt-1">{target.title}</p>}
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            {target.citation_count} citations · {target.retrieval_count} retrievals · rate {target.citation_rate}
            {target.competitors_present.length > 0 && (
              <> · competitors: <span className="text-amber-300">{target.competitors_present.length}</span></>
            )}
          </p>
        </div>
      </header>
      <div>
        <SubHeading>Why strategic</SubHeading>
        <p className="text-sm text-zinc-200 leading-relaxed">{plan.why_strategic}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <SubHeading>Target contact</SubHeading>
          <p className="text-zinc-200">{plan.target_contact}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <SubHeading>Angle</SubHeading>
          <p className="text-zinc-200">{plan.angle}</p>
        </div>
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200 hover:underline">Draft outreach ›</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-zinc-300 scrollbar-thin">{plan.draft_outreach}</pre>
      </details>
      {plan.alternatives.length > 0 && (
        <div>
          <SubHeading>Fallback approaches</SubHeading>
          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300">
            {plan.alternatives.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </article>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 mb-1.5">{children}</div>;
}
function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />;
}
function ErrorPill({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{message}</div>;
}
function LoadingState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-white/10 card-inset p-4 text-sm text-zinc-400 flex items-center gap-3">
      <Spinner />
      {message}
    </div>
  );
}
function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <div className="text-sm font-medium text-zinc-200">{title}</div>
      <p className="text-xs text-zinc-500 mt-1">{message}</p>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "warn" | "success" }) {
  const toneClass = tone === "warn" ? "text-amber-300" : tone === "success" ? "text-emerald-300" : "text-zinc-100";
  return (
    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono">
      <span className={`${toneClass} font-semibold`}>{value}</span> <span className="text-zinc-500">{label}</span>
    </span>
  );
}
function Pill({ label, value }: { label: string; value: string }) {
  const tone = value === "high" ? "text-emerald-300" : value === "medium" ? "text-amber-300" : "text-zinc-300";
  return (
    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] ring-1 ring-inset ring-white/10">
      <span className="text-zinc-500">{label}: </span>
      <span className={tone}>{value}</span>
    </span>
  );
}
