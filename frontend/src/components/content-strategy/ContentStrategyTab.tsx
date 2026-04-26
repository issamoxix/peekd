import { useProjectContext } from "../../context/ProjectContext";
import { useGapAnalysis } from "../../hooks/useGapAnalysis";
import { useContentStrategy, useRunStrategy, useToggleQuickWin } from "../../hooks/useContentStrategy";
import { useCurrentSelection } from "../../hooks/useCurrentSelection";
import { Button, Card } from "../ui";
import { StrategyResults } from "./StrategyResults";
import { AnalysisProgress } from "../gap-analysis/AnalysisProgress";

export function ContentStrategyTab() {
  const { currentProjectId, setActiveTab } = useProjectContext();
  const selection = useCurrentSelection();
  const { data: gapAnalysis, isLoading: isLoadingGap } = useGapAnalysis(currentProjectId);
  const { data: existingStrategy, isLoading: isLoadingStrategy } = useContentStrategy(currentProjectId);
  const { runStrategy, isRunning, progress, result, error, cancel } = useRunStrategy();
  const toggleQuickWin = useToggleQuickWin(currentProjectId);

  const handleGenerateStrategy = () => {
    if (!currentProjectId) return;
    runStrategy(currentProjectId, { peecProjectId: selection.projectId || undefined });
  };

  const handleToggleQuickWin = (quickWinId: string, completed: boolean) => {
    toggleQuickWin.mutate({ quickWinId, completed });
  };

  const strategyToShow = result || existingStrategy;

  // Loading state
  if (isLoadingGap || isLoadingStrategy) {
    return (
      <Card title="Content Strategy">
        <div className="text-center py-12">
          <p className="text-muted">Loading...</p>
        </div>
      </Card>
    );
  }

  // No gap analysis - need to complete Tab 1 first
  if (!gapAnalysis) {
    return (
      <Card title="Content Strategy">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
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
          <p className="text-muted font-medium mb-2">Gap Analysis Required</p>
          <p className="text-sm text-muted mb-6">
            Complete the gap analysis first to generate a content strategy.
          </p>
          <Button onClick={() => setActiveTab(0)}>Go to Gap Analysis</Button>
        </div>
      </Card>
    );
  }

  // Strategy is generating
  if (isRunning) {
    return (
      <Card title="Content Strategy">
        <div className="py-8">
          <AnalysisProgress progress={progress} isRunning={isRunning} />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card title="Content Strategy">
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
          <p className="text-red-600 font-medium mb-2">Strategy generation failed</p>
          <p className="text-sm text-muted mb-4">{error.message}</p>
          <Button onClick={handleGenerateStrategy}>Try Again</Button>
        </div>
      </Card>
    );
  }

  // Strategy exists
  if (strategyToShow) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Content Strategy</h3>
          <Button variant="secondary" onClick={handleGenerateStrategy}>
            Regenerate
          </Button>
        </div>
        <StrategyResults
          strategy={strategyToShow}
          onToggleQuickWin={handleToggleQuickWin}
        />
      </div>
    );
  }

  // Ready to generate
  return (
    <Card title="Content Strategy">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-muted mb-2">Ready to generate your content strategy</p>
        <p className="text-sm text-muted mb-6">
          Based on your gap analysis, we'll create actionable articles, structured data templates, PR angles, and quick wins.
        </p>
        <Button onClick={handleGenerateStrategy}>Generate Strategy</Button>
      </div>
    </Card>
  );
}
