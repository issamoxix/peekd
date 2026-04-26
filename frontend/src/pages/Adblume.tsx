import { useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Download,
  Eye,
  FileText,
  Gauge,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  brandProfile,
  brands,
  domainReportRows,
  project,
  prompts,
  topics,
  urlReportRows,
} from "../data/adblume-snapshot";
import { makeGapAction, makeLaunchPack } from "../lib/adblume/actions";
import { getQueryGaps, summarizeByIntent } from "../lib/adblume/gaps";
import type { QueryGap } from "../lib/adblume/types";

type Tab = "gaps" | "fit" | "actions" | "setup";

const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "gaps", label: "Gap Analysis", icon: Search },
  { id: "fit", label: "Brand Fit Review", icon: ShieldCheck },
  { id: "actions", label: "Action Plan", icon: ClipboardCheck },
  { id: "setup", label: "Setup & Measurement", icon: Settings2 },
];

const intentLabels: Record<QueryGap["customerIntent"], string> = {
  hire_studio: "Hire a studio",
  compare_vendors: "Compare vendors",
  explore_ai: "Explore AI",
  launch_ecommerce: "Launch ecommerce",
  evaluate_adblume: "Evaluate Adblume",
};

const stateLabels: Record<QueryGap["gapState"], string> = {
  untracked_opportunity: "Untracked",
  tracked_pending: "Tracked pending",
  simulated_competitor_gap: "Simulated gap",
  measured_gap: "Measured gap",
};

const actionLabels: Record<QueryGap["recommendedAction"], string> = {
  create_service_page: "Service page",
  create_comparison_page: "Comparison page",
  create_alternatives_page: "Alternatives page",
  create_listicle: "Listicle",
  create_faq_article: "FAQ/article",
  source_outreach: "Source outreach",
};

function scoreClass(label: QueryGap["scoreLabel"]) {
  if (label === "High") return "score high";
  if (label === "Medium") return "score medium";
  return "score low";
}

function statusClass(status: QueryGap["approvalStatus"]) {
  return `approval ${status.replace("_", "-")}`;
}

function numberMetric(label: string, value: number | string, detail?: string) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function formatPercent(value?: number) {
  if (value === undefined) return "n/a";
  return `${Math.round(value * 100)}%`;
}

export default function Adblume() {
  const initialGaps = useMemo(() => getQueryGaps(), []);
  const [tab, setTab] = useState<Tab>("gaps");
  const [selectedId, setSelectedId] = useState(initialGaps[0]?.id ?? "");
  const [approvalById, setApprovalById] = useState<Record<string, QueryGap["approvalStatus"]>>({});

  const gaps = useMemo(
    () =>
      initialGaps.map((gap) => ({
        ...gap,
        approvalStatus: approvalById[gap.id] ?? gap.approvalStatus,
      })),
    [approvalById, initialGaps],
  );
  const selected = gaps.find((gap) => gap.id === selectedId) ?? gaps[0];
  const action = selected ? makeGapAction(selected) : null;
  const intentSummary = summarizeByIntent(gaps);
  const approvedCount = gaps.filter((gap) => gap.approvalStatus === "approved").length;
  const rejectedCount = gaps.filter((gap) => gap.approvalStatus === "rejected").length;
  const launchPack = makeLaunchPack(gaps);
  const measuredGaps = gaps.filter((gap) => gap.gapState === "measured_gap");
  const biggestGap = measuredGaps.reduce(
    (current, gap) => Math.max(current, gap.visibilityGap ?? 0),
    0,
  );

  function setApproval(status: QueryGap["approvalStatus"]) {
    if (!selected) return;
    setApprovalById((current) => ({ ...current, [selected.id]: status }));
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Peec AI hackathon build</p>
          <h1>Adblume Query Gap + Action Engine</h1>
          <p className="subhead">
            Detect customer query gaps, validate brand fit, and generate the next action to win AI-search visibility.
          </p>
        </div>
        <div className="topbarCard">
          <span>Measured mode</span>
          <strong>{project.chatCount} Peec chats · {project.reportDate}</strong>
        </div>
      </header>

      <section className="summaryGrid" aria-label="Project summary">
        {numberMetric("Measured prompts", measuredGaps.length, `${prompts.length} tracked total`)}
        {numberMetric("Biggest visibility gap", formatPercent(biggestGap), "competitor lead")}
        {numberMetric("Source domains", domainReportRows.length, "from Peec reports")}
        {numberMetric("Approved actions", approvedCount, `${rejectedCount} rejected`)}
      </section>

      <nav className="tabs" aria-label="Dashboard sections">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={tab === item.id ? "tab active" : "tab"}
              type="button"
              onClick={() => setTab(item.id)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "gaps" ? (
        <section className="workspace twoCol">
          <div className="panel large">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Default view</p>
                <h2>Ranked query gaps</h2>
              </div>
              <span className="pill ok">Measured Peec reports</span>
            </div>
            <div className="table">
              <div className="tableHead">
                <span>Customer query</span>
                <span>Intent</span>
                <span>Measured gap</span>
                <span>Action</span>
                <span>Status</span>
              </div>
              {gaps.map((gap) => (
                <button
                  key={gap.id}
                  type="button"
                  className={selected?.id === gap.id ? "tableRow selected" : "tableRow"}
                  onClick={() => setSelectedId(gap.id)}
                >
                  <span>
                    <strong>{gap.query}</strong>
                    <small>
                      {gap.topicName} · {stateLabels[gap.gapState]}
                    </small>
                  </span>
                  <span>
                    {intentLabels[gap.customerIntent]}
                    <small>{gap.funnelStage}</small>
                  </span>
                  <span className="scoreStack">
                    <b className={scoreClass(gap.scoreLabel)}>{gap.totalScore}</b>
                    <small>
                      A {formatPercent(gap.ownVisibility)} · C {formatPercent(gap.competitorVisibility)} · Fit {gap.sentimentFitScore}
                    </small>
                  </span>
                  <span>{actionLabels[gap.recommendedAction]}</span>
                  <span className={statusClass(gap.approvalStatus)}>{gap.approvalStatus.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="panel detail">
            <DetailHeader gap={selected} />
            <ScoreBreakdown gap={selected} />
            <MeasuredBreakdown gap={selected} />
            <div className="sectionBlock">
              <h3>Where customers are searching</h3>
              <div className="intentList">
                {intentSummary.map((item) => (
                  <div key={item.intent}>
                    <span>{intentLabels[item.intent]}</span>
                    <strong>{item.count} queries · avg {item.averageScore}</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {tab === "fit" && selected ? (
        <section className="workspace twoCol">
          <div className="panel large">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Human-in-the-loop</p>
                <h2>Brand fit review</h2>
              </div>
              <span className={statusClass(selected.approvalStatus)}>{selected.approvalStatus.replace("_", " ")}</span>
            </div>
            <div className="reviewHero">
              <h3>{selected.query}</h3>
              <p>
                This query maps to a {selected.funnelStage} buyer moment and supports{" "}
                {selected.alignedPropositions.join(", ") || "Adblume's core positioning"}.
              </p>
            </div>
            <div className="reviewGrid">
              <div className="sectionBlock">
                <h3>Why it fits</h3>
                <ul>
                  {selected.alignedPropositions.map((item) => (
                    <li key={item}><CheckCircle2 size={15} /> {item}</li>
                  ))}
                  <li><CheckCircle2 size={15} /> Customer intent: {intentLabels[selected.customerIntent]}</li>
                  <li><CheckCircle2 size={15} /> Recommended action: {actionLabels[selected.recommendedAction]}</li>
                </ul>
              </div>
              <div className="sectionBlock">
                <h3>Potential conflicts</h3>
                {selected.riskFlags.length ? (
                  <ul>
                    {selected.riskFlags.map((flag) => (
                      <li key={flag}><TriangleAlert size={15} /> {flag}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No off-brand terms detected. Review the final wording for luxury positioning.</p>
                )}
              </div>
            </div>
            <div className="approvalBar">
              <button type="button" onClick={() => setApproval("approved")}>Approve</button>
              <button type="button" onClick={() => setApproval("needs_refinement")}>Needs refinement</button>
              <button type="button" onClick={() => setApproval("rejected")}>Reject</button>
            </div>
          </div>
          <aside className="panel detail">
            <ScoreBreakdown gap={selected} />
            <MeasuredBreakdown gap={selected} />
            <div className="sectionBlock">
              <h3>Winning competitors</h3>
              <div className="chipList">
                {selected.winningCompetitors?.length
                  ? selected.winningCompetitors.map((competitor) => (
                      <span key={competitor.brand}>
                        {competitor.brand} · {formatPercent(competitor.visibility)}
                      </span>
                    ))
                  : selected.likelyCompetitors.map((competitor) => <span key={competitor}>{competitor}</span>)}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {tab === "actions" && selected && action ? (
        <section className="workspace twoCol">
          <div className="panel large">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Execution brief</p>
                <h2>{action.title}</h2>
              </div>
              <span className={scoreClass(action.priority)}>{action.priority}</span>
            </div>
            <div className="actionMeta">
              <span>{actionLabels[action.assetType]}</span>
              <span>{action.effort} effort</span>
              <span>{selected.approvalStatus.replace("_", " ")}</span>
            </div>
            <div className="sectionBlock impactBlock">
              <h3>Impact hypothesis</h3>
              <p>{action.impactHypothesis}</p>
            </div>
            <div className="sectionBlock">
              <h3>Evidence behind the recommendation</h3>
              <ul>
                {action.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="sectionBlock">
              <h3>Why this fills the gap</h3>
              <p>{action.rationale}</p>
            </div>
            <div className="sectionBlock">
              <h3>AI-answer block</h3>
              <p className="answerBlock">{action.aiAnswerBlock}</p>
            </div>
            <div className="sectionBlock assetDraft">
              <h3>Ready-to-publish page draft</h3>
              <div className="draftMeta">
                <span>Slug: {action.assetDraft.slug}</span>
                <span>Schema: {action.assetDraft.schemaType}</span>
              </div>
              <h4>{action.assetDraft.h1}</h4>
              <p className="muted"><strong>SEO title:</strong> {action.assetDraft.seoTitle}</p>
              <p className="muted"><strong>Meta:</strong> {action.assetDraft.metaDescription}</p>
              <p className="answerBlock">{action.assetDraft.heroCopy}</p>
              <div className="draftSections">
                {action.assetDraft.sections.map((section) => (
                  <article key={section.heading}>
                    <h5>{section.heading}</h5>
                    <p>{section.body}</p>
                  </article>
                ))}
              </div>
              <p className="ctaLine">{action.assetDraft.conversionCta}</p>
            </div>
            <div className="reviewGrid">
              <div className="sectionBlock">
                <h3>Outline</h3>
                <ol>
                  {action.outline.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </div>
              <div className="sectionBlock">
                <h3>Source targets</h3>
                <ul>
                  {action.sourceTargets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="sectionBlock">
              <h3>Implementation steps</h3>
              <ol>
                {action.implementationSteps.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
            <div className="sectionBlock">
              <h3>Success metrics</h3>
              <ul>
                {action.successMetrics.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
          <aside className="panel detail">
            <div className="panelHeader tight">
              <div>
                <p className="eyebrow">Export</p>
                <h2>Launch pack</h2>
              </div>
              <Download size={18} />
            </div>
            <p className="muted">Rejected gaps are excluded. This is ready to move into Notion, Docs, or Linear.</p>
            <div className="downloadLinks">
              <a href="/adblume-implementation-plan.pdf" download>
                <Download size={15} />
                Download PDF plan
              </a>
              <a href="/adblume-implementation-plan.md" download>
                <FileText size={15} />
                Download Markdown brief
              </a>
            </div>
            <textarea readOnly value={launchPack} className="markdownBox" aria-label="Markdown launch pack" />
          </aside>
        </section>
      ) : null}

      {tab === "setup" ? (
        <section className="workspace twoCol">
          <div className="panel large">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Peec setup</p>
                <h2>{brandProfile.name}</h2>
              </div>
              <span className="pill ok">Own brand configured</span>
            </div>
            <p className="brandDesc">{brandProfile.description}</p>
            <div className="setupGrid">
              <SetupItem icon={CheckCircle2} title="Own brand" value={`${brandProfile.name} · ${brandProfile.domain}`} />
              <SetupItem icon={Compass} title="Project" value={project.id} />
              <SetupItem icon={Gauge} title="Competitors" value={`${brands.filter((brand) => !brand.isOwn).length} brands configured`} />
              <SetupItem icon={FileText} title="Prompts" value={`${prompts.length} Peec prompts seeded`} />
              <SetupItem icon={BarChart3} title="Topics" value={`${topics.length} query buckets`} />
              <SetupItem icon={Eye} title="Report status" value={`${project.chatCount} chats measured today`} />
            </div>
            <div className="sectionBlock">
              <h3>Measured report fields</h3>
              <div className="futureGrid">
                {["Own visibility", "Competitor visibility", "Mention count", "Sentiment", "Position", "Cited domains", "Source URLs"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
          <aside className="panel detail">
            <div className="panelHeader tight">
              <div>
                <p className="eyebrow">Measurement state</p>
                <h2>Live baseline</h2>
              </div>
              <Sparkles size={18} />
            </div>
            <p className="pending measured">{project.reportStatus}</p>
            <div className="sectionBlock">
              <h3>Top cited domains</h3>
              <div className="miniStats">
                {domainReportRows.slice(0, 5).map((row) => (
                  <span key={row.domain}>
                    {row.domain} <b>{row.citationCount} citations</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="sectionBlock">
              <h3>Top source URLs</h3>
              <ul>
                {urlReportRows.slice(0, 5).map((row) => (
                  <li key={row.url}>{row.title} · {row.citationCount} citations</li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      ) : null}
    </div>
  );
}

function DetailHeader({ gap }: { gap?: QueryGap }) {
  if (!gap) return null;
  return (
    <>
      <div className="panelHeader tight">
        <div>
          <p className="eyebrow">Selected gap</p>
          <h2>{gap.query}</h2>
        </div>
        <span className={scoreClass(gap.scoreLabel)}>{gap.scoreLabel}</span>
      </div>
      <p className="muted">
        {gap.gapState === "measured_gap"
          ? `Measured by Peec today: Adblume ${formatPercent(gap.ownVisibility)} vs competitor leader ${formatPercent(gap.competitorVisibility)}.`
          : gap.gapState === "untracked_opportunity"
            ? "Local opportunity: add this to Peec when more credits are available."
            : gap.gapState === "simulated_competitor_gap"
              ? "Clearly labeled demo simulation, not used for measured scoring."
              : "Tracked in Peec; visibility reports are pending."}
      </p>
    </>
  );
}

function MeasuredBreakdown({ gap }: { gap?: QueryGap }) {
  if (!gap || gap.gapState !== "measured_gap") return null;
  return (
    <div className="sectionBlock">
      <h3>Measured Peec baseline</h3>
      <div className="miniStats">
        <span>Adblume visibility <b>{formatPercent(gap.ownVisibility)}</b></span>
        <span>Competitor leader <b>{formatPercent(gap.competitorVisibility)}</b></span>
        <span>Visibility gap <b>{formatPercent(gap.visibilityGap)}</b></span>
        <span>Mentions <b>{gap.mentionCount ?? 0}</b></span>
        <span>Sentiment <b>{gap.sentiment ?? "n/a"}</b></span>
        <span>Position <b>{gap.position ?? "n/a"}</b></span>
      </div>
      {gap.sourceUrls?.length ? (
        <ul className="sourceList">
          {gap.sourceUrls.map((url) => (
            <li key={url}>{url}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ScoreBreakdown({ gap }: { gap?: QueryGap }) {
  if (!gap) return null;
  const scores = [
    ["Intent", gap.intentScore],
    ["Sentiment fit", gap.sentimentFitScore],
    ["Competitor pressure", gap.competitorPressureScore],
    ["Adblume fit", gap.adblumeFitScore],
    ["Content gap", gap.contentGapScore],
  ];
  return (
    <div className="sectionBlock">
      <h3>Scoring breakdown</h3>
      <div className="scoreBars">
        {scores.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <div><i style={{ width: `${value}%` }} /></div>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetupItem({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
}) {
  return (
    <div className="setupItem">
      <Icon size={18} />
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
