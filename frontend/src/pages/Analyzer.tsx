import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ProjectProvider, useProjectContext } from "../context/ProjectContext";
import { useProject, useCreateProject } from "../hooks/useProjects";
import { useCurrentSelection } from "../hooks/useCurrentSelection";
import { GapAnalysisTab } from "../components/gap-analysis";
import { ContentStrategyTab } from "../components/content-strategy";

const TABS = ["Gap Analysis", "Content Strategy", "Progress Tracker"];

function SelectionBanner() {
  const selection = useCurrentSelection();

  if (!selection.isConfigured) {
    return (
      <div className="bg-panel rounded-xl border border-soft-line p-4 mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          No project/brand selected. Choose one in{" "}
          <Link to="/settings" className="text-sage underline">
            Settings
          </Link>{" "}
          to run the analyzer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-panel rounded-xl border border-soft-line p-4 mb-6 flex items-center justify-between">
      <div className="text-sm">
        <span className="text-muted">Active brand: </span>
        <span className="font-medium text-ink">{selection.brandName || "—"}</span>
        {selection.projectName && (
          <span className="text-muted ml-2 text-xs">
            ({selection.projectName})
          </span>
        )}
      </div>
      <Link to="/settings" className="text-xs text-muted hover:text-ink">
        Change in Settings →
      </Link>
    </div>
  );
}

/**
 * Resolves a local Analyzer project for the active Settings selection.
 * The Peec brand_id is reused as the analyzer project id so the lookup is
 * deterministic and Settings remains the single source of truth.
 */
function useResolveAnalyzerProject(brandId: string, brandName: string) {
  const { setCurrentProjectId } = useProjectContext();
  const { data: project, isLoading } = useProject(brandId || null);
  const createProject = useCreateProject();
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setCurrentProjectId(null);
      return;
    }

    if (project) {
      setCurrentProjectId(brandId);
      return;
    }

    if (isLoading) return;
    if (attemptedRef.current === brandId) return;
    attemptedRef.current = brandId;

    createProject.mutate(
      {
        id: brandId,
        name: brandName || "Untitled brand",
        domain: "",
        brief: {
          brandName: brandName || "",
          domain: "",
          category: "",
          desiredTone: "Professional",
          desiredClaims: [],
          keyDifferentiators: [],
          competitors: [],
        },
      },
      {
        onSuccess: () => {
          setCurrentProjectId(brandId);
        },
      }
    );
  }, [brandId, brandName, project, isLoading, createProject, setCurrentProjectId]);
}

function AnalyzerTabs() {
  const { activeTab, setActiveTab } = useProjectContext();

  return (
    <div className="border-b border-soft-line mb-6">
      <nav className="flex gap-8">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === index
                ? "border-blue-500 text-sage"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

function AnalyzerBody() {
  const selection = useCurrentSelection();
  const { currentProjectId, activeTab } = useProjectContext();
  useResolveAnalyzerProject(selection.brandId, selection.brandName);

  if (!selection.isConfigured) {
    return (
      <div className="bg-panel rounded-xl border border-soft-line p-12 text-center text-muted">
        Select a project and brand in Settings to run the brand-gap analyzer.
      </div>
    );
  }

  if (!currentProjectId) {
    return (
      <div className="bg-panel rounded-xl border border-soft-line p-12 text-center text-muted">
        Loading analyzer for selected brand…
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 rounded-xl p-6">
      <AnalyzerTabs />
      {activeTab === 0 && <GapAnalysisTab />}
      {activeTab === 1 && <ContentStrategyTab />}
      {activeTab === 2 && (
        <div className="text-muted">Progress Tracker tab — coming soon</div>
      )}
    </div>
  );
}

export function Analyzer() {
  return (
    <ProjectProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Brand Analyzer</h1>
          <p className="text-muted text-sm mt-1">
            Gap analysis and content strategy powered by Peec AI + Claude
          </p>
        </div>
        <SelectionBanner />
        <AnalyzerBody />
      </div>
    </ProjectProvider>
  );
}
