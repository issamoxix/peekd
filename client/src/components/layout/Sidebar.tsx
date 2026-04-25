import { useProjects, useCreateProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button } from "../ui";
import type { Project } from "shared";

export function Sidebar() {
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

  const handleSelectProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setActiveTab(0);
  };

  return (
    <aside className="w-64 bg-navy text-white flex flex-col h-screen">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold">Brand Gap Analyzer</h1>
      </div>

      <div className="p-4 border-b border-white/10">
        <Button onClick={handleNewProject} className="w-full" disabled={createProject.isPending}>
          {createProject.isPending ? "Creating..." : "+ New Project"}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading && <p className="text-gray-400 p-2">Loading...</p>}
        {projects?.map((project) => (
          <button
            key={project.id}
            onClick={() => handleSelectProject(project)}
            className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors ${
              currentProjectId === project.id
                ? "bg-teal text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <div className="font-medium truncate">{project.name}</div>
            <div className="text-sm opacity-70 truncate">{project.domain}</div>
          </button>
        ))}
        {projects?.length === 0 && (
          <p className="text-gray-400 p-2 text-sm">No projects yet. Create one to get started.</p>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-gray-400">
        Powered by Peec AI + Claude
      </div>
    </aside>
  );
}
