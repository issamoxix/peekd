import { BrandBriefForm } from "./BrandBriefForm";
import { useProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button, Card } from "../ui";

export function GapAnalysisTab() {
  const { currentProjectId } = useProjectContext();
  const { data: project } = useProject(currentProjectId);

  const brief = project?.brief;
  const isComplete = brief?.brandName && brief?.domain && brief?.category && brief?.desiredClaims?.length;

  const handleRunAnalysis = () => {
    // Will implement with SSE in next phase
    alert("Analysis not yet implemented");
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <BrandBriefForm />
      </div>
      <div>
        <Card title="Analysis">
          {!isComplete ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Complete the brand brief to run analysis</p>
              <p className="text-sm">Fill in at least brand name, domain, category, and desired claims</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Ready to analyze how LLMs describe your brand</p>
              <Button onClick={handleRunAnalysis}>Run Analysis</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
