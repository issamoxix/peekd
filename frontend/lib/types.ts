export type Brand = {
  id: string;
  name: string;
  domains: string[];
  aliases?: string[];
  isOwn: boolean;
};

export type Topic = {
  id: string;
  name: string;
};

export type Prompt = {
  id: string;
  text: string;
  topicId: string;
  tagIds: string[];
  countryCode: "US";
};

export type UntrackedQuery = {
  id: string;
  query: string;
  topicName: string;
};

export type WinningCompetitor = {
  brand: string;
  visibility: number;
  mentionCount: number;
  position?: number | null;
};

export type BrandReportRow = {
  brandId: string;
  brandName: string;
  promptId: string;
  visibility: number;
  mentionCount: number;
  shareOfVoice: number;
  sentiment: number | null;
  position: number | null;
};

export type DomainReportRow = {
  domain: string;
  classification: string;
  retrievedPercentage: number;
  retrievalRate: number;
  citationRate: number;
  retrievalCount: number;
  citationCount: number;
  mentionedBrandIds: string[];
};

export type UrlReportRow = {
  url: string;
  classification: string;
  title: string;
  citationCount: number;
  retrievalCount: number;
  citationRate: number;
  mentionedBrandIds: string[];
};

export type QueryGap = {
  id: string;
  query: string;
  promptId?: string;
  topicName: string;
  customerIntent:
    | "hire_studio"
    | "compare_vendors"
    | "explore_ai"
    | "launch_ecommerce"
    | "evaluate_adblume";
  funnelStage: "awareness" | "consideration" | "decision";
  gapState:
    | "untracked_opportunity"
    | "tracked_pending"
    | "simulated_competitor_gap"
    | "measured_gap";
  intentScore: number;
  sentimentFitScore: number;
  competitorPressureScore: number;
  adblumeFitScore: number;
  contentGapScore: number;
  totalScore: number;
  scoreLabel: "High" | "Medium" | "Low";
  likelyCompetitors: string[];
  alignedPropositions: string[];
  riskFlags: string[];
  approvalStatus: "pending" | "approved" | "needs_refinement" | "rejected";
  recommendedAction:
    | "create_service_page"
    | "create_comparison_page"
    | "create_alternatives_page"
    | "create_listicle"
    | "create_faq_article"
    | "source_outreach";
  ownVisibility?: number;
  competitorVisibility?: number;
  visibilityGap?: number;
  mentionCount?: number;
  sentiment?: number | null;
  position?: number | null;
  citedDomains?: string[];
  sourceUrls?: string[];
  winningCompetitors?: WinningCompetitor[];
};

export type GapAction = {
  queryGapId: string;
  title: string;
  assetType: QueryGap["recommendedAction"];
  priority: "High" | "Medium" | "Low";
  effort: "Small" | "Medium" | "Large";
  evidence: string[];
  impactHypothesis: string;
  rationale: string;
  outline: string[];
  aiAnswerBlock: string;
  faqItems: Array<{ question: string; answer: string }>;
  sourceTargets: string[];
  implementationSteps: string[];
  successMetrics: string[];
  assetDraft: {
    slug: string;
    seoTitle: string;
    metaDescription: string;
    h1: string;
    heroCopy: string;
    sections: Array<{ heading: string; body: string }>;
    conversionCta: string;
    schemaType: "Service" | "Article" | "FAQPage";
  };
  markdown: string;
};
