import { createContext, useContext, useState, type ReactNode } from "react";

interface ProjectContextValue {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <ProjectContext.Provider
      value={{ currentProjectId, setCurrentProjectId, activeTab, setActiveTab }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
