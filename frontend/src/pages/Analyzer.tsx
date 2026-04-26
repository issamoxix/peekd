import { ProjectProvider, useProjectContext } from "../context/ProjectContext";
import { useProjects, useCreateProject } from "../hooks/useProjects";
import { GapAnalysisTab } from "../components/gap-analysis";
import { ContentStrategyTab } from "../components/content-strategy";
import { Button } from "../components/ui";
import type { Project } from "shared";

const TABS = ["Gap Analysis", "Content Strategy", "Progress Tracker"];

function ProjectPicker() {
  const { data: projects, isLoading } = useProjects();
  const { currentProjectId, setCurrentProjectId, setActiveTab } = useProjectContext();
  const createProject = useCreateProject();

  const handleNewProject = () => {
    const name = prompt("Project name:");
    if (!name) return;
    const domain = prompt("Domain (e.g., example.com):");
    if (!domain) return;

    createProject.mutate(
      {
        name,
        domain,
        brief: {
          brandName: name,
          domain,
          category: "",
          desiredTone: "Professional",
          desiredClaims: [],
          keyDifferentiators: [],
          competitors: [],
        },
      },
      {
        onSuccess: (project) => {
          setCurrentProjectId(project.id);
          setActiveTab(0);
        },
      }
    );
  };

  return (
    <div className="bg-panel rounded-xl border border-soft-line p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Analyzer Projects</h2>
        <Button onClick={handleNewProject} disabled={createProject.isPending}>
          {createProject.isPending ? "Creating..." : "+ New Project"}
        </Button>
      </div>
      {isLoading && <p className="text-muted text-sm">Loading…</p>}
      <div className="flex flex-wrap gap-2">
        {projects?.map((project: Project) => (
          <button
            key={project.id}
            onClick={() => {
              setCurrentProjectId(project.id);
              setActiveTab(0);
            }}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              currentProjectId === project.id
                ? "bg-sage text-ink"
                : "bg-pearl text-ink hover:bg-pearl"
            }`}
          >
            <span className="font-medium">{project.name}</span>
            <span className="opacity-60 ml-2 text-xs">{project.domain}</span>
          </button>
        ))}
        {projects?.length === 0 && (
          <p className="text-muted text-sm">No projects yet — create one to begin.</p>
        )}
      </div>
    </div>
  );
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
  const { currentProjectId, activeTab } = useProjectContext();

  if (!currentProjectId) {
    return (
      <div className="bg-panel rounded-xl border border-soft-line p-12 text-center text-muted">
        Select or create a project to run the brand-gap analyzer.
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
        <ProjectPicker />
        <AnalyzerBody />
      </div>
    </ProjectProvider>
  );
}
