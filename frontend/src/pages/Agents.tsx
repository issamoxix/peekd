import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentSelection } from "../hooks/useCurrentSelection";

const API = "/agents-api";

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

type Tab = "sentiment-flip" | "infiltration";

const TABS: { id: Tab; label: string; icon: string; hint: string }[] = [
  { id: "sentiment-flip", label: "Sentiment Flip", icon: "◈", hint: "Defend" },
  { id: "infiltration", label: "Source Infiltration", icon: "◉", hint: "Expand" },
];

export default function Agents() {
  const { projectId, brandId, brandName, isConfigured } = useCurrentSelection();
  const [tab, setTab] = useState<Tab>("sentiment-flip");

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
    <div className="text-ink space-y-8">
      <Hero brandName={brandName} />

      <TabBar tab={tab} setTab={setTab} />

      <div>
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
      <div className="rounded-xl border border-line card-surface p-1.5 flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group relative flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ring-focus ${
                active ? "bg-sage text-white shadow-[0_8px_20px_-10px_rgba(73,107,90,0.5)]" : "text-muted hover:text-ink hover:bg-pearl"
              }`}
            >
              <span className="relative flex items-center gap-2">
                <span className={`text-[13px] ${active ? "text-white/80" : "text-muted"}`}>{t.icon}</span>
                <span>{t.label}</span>
                <span
                  className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                    active ? "bg-white/15 text-white" : "bg-pearl text-muted"
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
    <label className="flex flex-col text-[11px] uppercase tracking-wider font-medium text-muted">
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
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      {right}
    </header>
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
    <section className="rounded-2xl border border-line card-surface p-5 sm:p-6 space-y-5">
      <SectionHeader
        step="2"
        title="Run Sentiment Flip Agent"
        hint="Detect negative AI mentions and generate counter-content"
        accent="bg-red-soft text-red ring-1 ring-inset ring-red/30"
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
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-ink" />
        </Field>
        <Field label="Max chats">
          <input type="number" min={1} max={500} value={maxChats} onChange={(e) => setMaxChats(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-ink" />
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
    <article className="rounded-xl border border-line card-inset p-4 sm:p-5 space-y-4">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-amber-soft px-2 py-0.5 font-mono text-amber ring-1 ring-inset ring-amber/40">{finding.model_channel_id}</span>
        <span className="font-mono text-muted">{finding.chat_id.slice(0, 16)}…</span>
        <span className="text-muted">brand: <span className="text-ink">{finding.brand_name}</span></span>
      </header>
      <div>
        <SubHeading>Negative claims</SubHeading>
        <ul className="list-disc list-inside space-y-1 text-sm text-ink">
          {finding.claims.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
      <div>
        <SubHeading>Response excerpt</SubHeading>
        <pre className="whitespace-pre-wrap rounded-lg border border-soft-line bg-pearl p-3 text-xs text-muted max-h-40 overflow-auto scrollbar-thin">{finding.response_excerpt}</pre>
      </div>
      <div>
        <SubHeading>Cited sources</SubHeading>
        <ul className="space-y-1 text-xs">
          {finding.sources.slice(0, 5).map((s, i) => (
            <li key={i} className="font-mono flex items-baseline gap-2">
              <span className="text-muted shrink-0">{s.domain}</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sage hover:text-graphite hover:underline truncate">{s.url.slice(0, 80)}</a>
            </li>
          ))}
        </ul>
      </div>
      {plans.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-soft-line">
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
      ? "text-emerald-700 bg-emerald-500/10 ring-emerald-500/30"
      : supports === "partial"
      ? "text-amber bg-amber-soft ring-amber/40"
      : "text-red bg-rose-500/10 ring-rose-500/30";
  return (
    <div className="rounded-xl border border-line bg-paper p-4 space-y-3 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ink italic leading-relaxed">&ldquo;{plan.claim}&rdquo;</p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-mono ring-1 ring-inset ${supportsColor}`}>source: {supports}</span>
      </div>
      <a href={plan.source_url} target="_blank" rel="noreferrer" className="block truncate text-xs font-mono text-sage hover:text-graphite hover:underline">{plan.source_url}</a>
      {plan.plan.source_assessment.key_quotes.length > 0 && (
        <div>
          <SubHeading>Key quotes</SubHeading>
          <ul className="space-y-1 text-xs text-muted">
            {plan.plan.source_assessment.key_quotes.map((q, i) => <li key={i}>&ldquo;{q}&rdquo;</li>)}
          </ul>
        </div>
      )}
      <div>
        <SubHeading>Rebuttal</SubHeading>
        <p className="text-ink leading-relaxed">{plan.plan.rebuttal}</p>
      </div>
      <div className="rounded-lg border border-soft-line bg-pearl p-3 space-y-1">
        <SubHeading>PR pitch</SubHeading>
        <p className="text-muted text-sm"><span className="font-medium text-ink">Target:</span> {plan.plan.pr_pitch.target}</p>
        <p className="text-muted text-sm"><span className="font-medium text-ink">Angle:</span> {plan.plan.pr_pitch.angle}</p>
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-sage hover:text-graphite hover:underline">Draft email ›</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md border border-soft-line bg-pearl p-3 text-xs text-muted scrollbar-thin">{plan.plan.pr_pitch.draft_email}</pre>
        </details>
      </div>
      <div>
        <SubHeading>New content ideas</SubHeading>
        <ul className="space-y-2 text-xs text-muted">
          {plan.plan.new_content.map((c, i) => (
            <li key={i} className="rounded-lg border border-soft-line bg-pearl p-3">
              <div className="text-ink font-medium">{c.title} <span className="font-normal text-muted">— {c.format}</span></div>
              <ul className="mt-1.5 list-disc list-inside text-muted space-y-0.5">
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
  guest_post: "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-300",
  product_review: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300",
  partnership: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-300",
  press_pitch: "bg-amber-soft text-amber ring-1 ring-inset ring-amber/40",
  community_engagement: "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-300",
  data_contribution: "bg-cyan-100 text-cyan-700 ring-1 ring-inset ring-cyan-300",
  comment_or_correction: "bg-pearl text-muted ring-1 ring-inset ring-line",
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
    <section className="rounded-2xl border border-line card-surface p-5 sm:p-6 space-y-5">
      <SectionHeader
        title="Source Infiltration Planner"
        hint="Find high-leverage citation gaps and generate outreach plans"
        accent="bg-sage-soft text-sage ring-1 ring-inset ring-sage/30"
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
      <p className="text-sm text-muted leading-relaxed">
        Maps which domains LLMs trust most in your category, finds the highest-leverage URLs where your brand is absent, and generates outreach plans to get included.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Days back">
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-ink" />
        </Field>
        <Field label="Max targets">
          <input type="number" min={1} max={20} value={maxTargets} onChange={(e) => setMaxTargets(Number(e.target.value))} className="input-base mt-1 w-28 rounded-lg px-3 py-2 text-sm text-ink" />
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
        <input type="text" value={excludeDomains} onChange={(e) => setExcludeDomains(e.target.value)} placeholder="traini.app, sarama.ai" className="input-base mt-1 w-full rounded-lg px-3 py-2 text-sm text-ink font-mono" />
      </Field>
      {excludeList.length > 0 && (
        <div className="-mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">blocking {excludeList.length}:</span>
          {excludeList.map((d) => (
            <span key={d} className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono text-red ring-1 ring-inset ring-rose-500/30">{d}</span>
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
    <div className="rounded-xl border border-line card-inset p-4">
      <SubHeading>Top cited domains in your category</SubHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
        {top.map((n) => {
          const pct = (n.citation_count / max) * 100;
          return (
            <div key={n.domain} className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-muted w-10 text-right shrink-0">{n.citation_count}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-ink font-mono truncate">{n.domain}</span>
                  {n.classification && <span className="text-[10px] text-muted uppercase tracking-wider shrink-0">{n.classification}</span>}
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-pearl overflow-hidden">
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
    <article className="rounded-xl border border-line card-inset p-5 space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-amber-soft px-2 py-0.5 font-mono text-amber ring-1 ring-inset ring-amber/40">⚡ score {target.leverage_score}</span>
          {target.classification && <span className="rounded-md bg-pearl px-2 py-0.5 font-mono text-muted ring-1 ring-inset ring-line">{target.classification}</span>}
          <span className={`rounded-md px-2 py-0.5 font-mono uppercase tracking-wider ${OUTREACH_COLOR[plan.outreach_type]}`}>{plan.outreach_type.replace("_", " ")}</span>
          <Pill label="effort" value={plan.effort} />
          <Pill label="impact" value={plan.expected_impact} />
          <button onClick={onBlock} title="Mark as competitor and exclude from future runs" className="ml-auto rounded-md border border-line px-2.5 py-0.5 text-xs text-muted hover:bg-rose-500/10 hover:text-red hover:border-rose-500/40 transition">⊘ Block {target.domain}</button>
        </div>
        <div>
          <a href={target.url} target="_blank" rel="noreferrer" className="text-sm text-sage hover:text-graphite hover:underline break-all">{target.url}</a>
          {target.title && <p className="text-xs text-muted mt-1">{target.title}</p>}
          <p className="text-xs text-muted mt-1 font-mono">
            {target.citation_count} citations · {target.retrieval_count} retrievals · rate {target.citation_rate}
            {target.competitors_present.length > 0 && (
              <> · competitors: <span className="text-amber">{target.competitors_present.length}</span></>
            )}
          </p>
        </div>
      </header>
      <div>
        <SubHeading>Why strategic</SubHeading>
        <p className="text-sm text-ink leading-relaxed">{plan.why_strategic}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-soft-line bg-pearl p-3">
          <SubHeading>Target contact</SubHeading>
          <p className="text-ink">{plan.target_contact}</p>
        </div>
        <div className="rounded-lg border border-soft-line bg-pearl p-3">
          <SubHeading>Angle</SubHeading>
          <p className="text-ink">{plan.angle}</p>
        </div>
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-sage hover:text-graphite hover:underline">Draft outreach ›</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-soft-line bg-pearl p-3 text-xs text-muted scrollbar-thin">{plan.draft_outreach}</pre>
      </details>
      {plan.alternatives.length > 0 && (
        <div>
          <SubHeading>Fallback approaches</SubHeading>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted">
            {plan.alternatives.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </article>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted mb-1.5">{children}</div>;
}
function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />;
}
function ErrorPill({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-red">{message}</div>;
}
function LoadingState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line card-inset p-4 text-sm text-muted flex items-center gap-3">
      <Spinner />
      {message}
    </div>
  );
}
function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-pearl/50 p-6 text-center">
      <div className="text-sm font-medium text-ink">{title}</div>
      <p className="text-xs text-muted mt-1">{message}</p>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "warn" | "success" }) {
  const toneClass = tone === "warn" ? "text-amber" : tone === "success" ? "text-emerald-700" : "text-ink";
  return (
    <span className="rounded-md border border-line bg-pearl px-2 py-1 font-mono">
      <span className={`${toneClass} font-semibold`}>{value}</span> <span className="text-muted">{label}</span>
    </span>
  );
}
function Pill({ label, value }: { label: string; value: string }) {
  const tone = value === "high" ? "text-emerald-700" : value === "medium" ? "text-amber" : "text-muted";
  return (
    <span className="rounded-md bg-pearl px-2 py-0.5 font-mono text-[11px] ring-1 ring-inset ring-line">
      <span className="text-muted">{label}: </span>
      <span className={tone}>{value}</span>
    </span>
  );
}
