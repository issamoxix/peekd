import { BrandBriefForm } from "./BrandBriefForm";
import { AnalysisProgress } from "./AnalysisProgress";
import { GapResults } from "./GapResults";
import { useProject } from "../../hooks/useProjects";
import { useGapAnalysis, useRunAnalysis } from "../../hooks/useGapAnalysis";
import { useCurrentSelection } from "../../hooks/useCurrentSelection";
import { useProjectContext } from "../../context/ProjectContext";
import { Button, Card } from "../ui";

export function GapAnalysisTab() {
  const { currentProjectId } = useProjectContext();
  const selection = useCurrentSelection();
  const { data: project } = useProject(currentProjectId);
  const { data: existingAnalysis, isLoading: isLoadingAnalysis } = useGapAnalysis(currentProjectId);
  const { runAnalysis, isRunning, progress, result, error, cancel } = useRunAnalysis();

  const brief = project?.brief;
  const isComplete = brief?.brandName && brief?.domain && brief?.category && brief?.desiredClaims?.length;

  const handleRunAnalysis = () => {
    if (!currentProjectId) return;
    runAnalysis(currentProjectId, { peecProjectId: selection.projectId || undefined });
  };

  // Determine which analysis to show (new result takes precedence over existing)
  const analysisToShow = result || existingAnalysis;

  const renderAnalysisPanel = () => {
    // Case 1: Brief is incomplete
    if (!isComplete) {
      return (
        <Card title="Analysis">
          <div className="text-center py-12 text-muted">
            <p className="mb-2">Complete the brand brief to run analysis</p>
            <p className="text-sm">Fill in at least brand name, domain, category, and desired claims</p>
          </div>
        </Card>
      );
    }

    // Case 2: Analysis is currently running
    if (isRunning) {
      return (
        <Card title="Analysis">
          <AnalysisProgress progress={progress} isRunning={isRunning} />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </Card>
      );
    }

    // Case 3: There was an error
    if (error) {
      return (
        <Card title="Analysis">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-red-600 font-medium mb-2">Analysis failed</p>
            <p className="text-sm text-muted mb-4">{error.message}</p>
            <Button onClick={handleRunAnalysis}>Try Again</Button>
          </div>
        </Card>
      );
    }

    // Case 4: Loading existing analysis
    if (isLoadingAnalysis) {
      return (
        <Card title="Analysis">
          <div className="text-center py-12">
            <p className="text-muted">Loading analysis...</p>
          </div>
        </Card>
      );
    }

    // Case 5: Analysis exists (either new or existing)
    if (analysisToShow) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            <Button variant="secondary" onClick={handleRunAnalysis}>
              Run Again
            </Button>
          </div>
          <GapResults analysis={analysisToShow} />
        </div>
      );
    }

    // Case 6: No analysis yet, brief is complete
    return (
      <Card title="Analysis">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal/10 mb-4">
            <svg
              className="w-8 h-8 text-teal"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-muted mb-2">Ready to analyze how LLMs describe your brand</p>
          <p className="text-sm text-muted mb-6">
            We will fetch reports from Peec AI and synthesize gaps between current and desired positioning.
          </p>
          <Button onClick={handleRunAnalysis}>Run Analysis</Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <BrandBriefForm />
      </div>
      <div>{renderAnalysisPanel()}</div>
    </div>
  );
}
