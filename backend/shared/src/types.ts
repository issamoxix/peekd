// Brand Brief - collected from user
export interface BrandBrief {
  id: string;
  projectId: string;
  brandName: string;
  domain: string;
  category: string;
  desiredTone: "Professional" | "Friendly" | "Technical" | "Thought Leader";
  desiredClaims: string[];
  keyDifferentiators: string[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
}

// Project - container for brand analysis
export interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  brief?: BrandBrief;
}

// Gap Analysis - result of comparing current vs desired state
export interface GapAnalysisGap {
  id: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  currentClaim: string;
  desiredClaim: string;
  rationale: string;
}

export interface CitationSource {
  domain: string;
  trustSignal: string;
  mentionCount: number;
}

export interface GapAnalysis {
  id: string;
  projectId: string;
  currentStateSummary: string;
  targetState: string;
  gaps: GapAnalysisGap[];
  citationSources: CitationSource[];
  createdAt: string;
}

// Content Strategy - generated action plan
export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  targetQuery: string;
  keyClaims: string[];
  wordCount: number;
  internalLinkingTargets: string[];
  schemaType: string;
}

export interface StructuredDataTemplate {
  id: string;
  schemaType: string;
  purpose: string;
  gapAddressed: string;
  jsonLd: string;
}

export interface PRAngle {
  id: string;
  headline: string;
  publicationType: string;
  hook: string;
  keyDataPoint: string;
  targetClaim: string;
}

export interface QuickWin {
  id: string;
  description: string;
  completed: boolean;
}

export interface ContentStrategy {
  id: string;
  projectId: string;
  gapAnalysisId: string;
  articles: KnowledgeBaseArticle[];
  structuredData: StructuredDataTemplate[];
  prAngles: PRAngle[];
  quickWins: QuickWin[];
  createdAt: string;
  updatedAt: string;
}

// Progress Snapshot - weekly tracking
export interface SnapshotMetrics {
  sentiment: Record<string, number>; // by LLM name
  citationRate: number;
  shareOfVoice: number;
  topCitedDomains: string[];
}

export interface Snapshot {
  id: string;
  projectId: string;
  isBaseline: boolean;
  weekKey: string;
  metrics: SnapshotMetrics;
  deltaAnalysis?: {
    sentimentShift: Record<string, { change: number; direction: "improved" | "declined" | "unchanged" }>;
    citationRateChange: number;
    newDomains: string[];
    lostDomains: string[];
    trajectory: "On track" | "Needs attention" | "Regressing";
    summary: string;
  };
  createdAt: string;
}

// SSE Event Types
export type SSEProgressStatus = "in_progress" | "complete" | "error";

export interface SSEProgressEvent {
  type: "progress";
  step: string;
  status: SSEProgressStatus;
  message?: string;
}

export interface SSECompleteEvent<T> {
  type: "complete";
  data: T;
}

export interface SSEErrorEvent {
  type: "error";
  code: string;
  message: string;
}

export type SSEEvent<T> = SSEProgressEvent | SSECompleteEvent<T> | SSEErrorEvent;

// API Request/Response Types
export interface CreateProjectRequest {
  name: string;
  domain: string;
  brief: Omit<BrandBrief, "id" | "projectId" | "createdAt" | "updatedAt">;
}

export interface UpdateBriefRequest {
  brandName?: string;
  domain?: string;
  category?: string;
  desiredTone?: BrandBrief["desiredTone"];
  desiredClaims?: string[];
  keyDifferentiators?: string[];
  competitors?: string[];
}

export interface ApiError {
  error: string;
  code: string;
}
