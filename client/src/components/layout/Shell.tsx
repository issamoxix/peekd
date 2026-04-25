import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TabNav } from "./TabNav";
import { useProjectContext } from "../../context/ProjectContext";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { currentProjectId } = useProjectContext();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {currentProjectId ? (
          <>
            <TabNav />
            {children}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select or create a project to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
