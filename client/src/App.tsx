import { ProjectProvider, useProjectContext } from "./context/ProjectContext";
import { Shell } from "./components/layout";
import { GapAnalysisTab } from "./components/gap-analysis";

function TabContent() {
  const { activeTab } = useProjectContext();

  switch (activeTab) {
    case 0:
      return <GapAnalysisTab />;
    case 1:
      return <div className="text-gray-600">Content Strategy tab - coming soon</div>;
    case 2:
      return <div className="text-gray-600">Progress Tracker tab - coming soon</div>;
    default:
      return null;
  }
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell>
        <TabContent />
      </Shell>
    </ProjectProvider>
  );
}
