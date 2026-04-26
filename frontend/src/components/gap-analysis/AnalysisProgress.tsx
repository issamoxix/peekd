import type { SSEProgressEvent } from "shared";

interface AnalysisProgressProps {
  progress: SSEProgressEvent[];
  isRunning: boolean;
}

const ANALYSIS_STEPS = [
  { key: "fetch_brand_report", label: "Fetching brand report" },
  { key: "fetch_domain_report", label: "Fetching domain report" },
  { key: "fetch_chats", label: "Fetching chats" },
  { key: "synthesize_analysis", label: "Synthesizing analysis" },
];

function getStepStatus(
  stepKey: string,
  progress: SSEProgressEvent[]
): "pending" | "in_progress" | "complete" | "error" {
  // Find the most recent event for this step
  const events = progress.filter((e) => e.step === stepKey);
  if (events.length === 0) return "pending";

  const lastEvent = events[events.length - 1];
  return lastEvent.status;
}

function StepIcon({ status }: { status: "pending" | "in_progress" | "complete" | "error" }) {
  switch (status) {
    case "complete":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal text-ink">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case "in_progress":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-teal">
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
        </span>
      );
    case "error":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-ink">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300">
          <span className="h-2 w-2 rounded-full bg-gray-300" />
        </span>
      );
  }
}

export function AnalysisProgress({ progress, isRunning }: AnalysisProgressProps) {
  const completedSteps = ANALYSIS_STEPS.filter(
    (step) => getStepStatus(step.key, progress) === "complete"
  ).length;

  const progressPercent = Math.round((completedSteps / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted">Analysis Progress</h4>
        <span className="text-sm text-muted">{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-teal transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-4">
        {ANALYSIS_STEPS.map((step, index) => {
          const status = getStepStatus(step.key, progress);
          const stepEvent = progress.find((e) => e.step === step.key);

          return (
            <div key={step.key} className="flex items-start gap-3">
              <StepIcon status={status} />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    status === "complete"
                      ? "text-gray-900"
                      : status === "in_progress"
                        ? "text-teal"
                        : status === "error"
                          ? "text-red-600"
                          : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
                {stepEvent?.message && (
                  <p className="text-xs text-muted mt-0.5">{stepEvent.message}</p>
                )}
              </div>
              {status === "in_progress" && isRunning && (
                <span className="text-xs text-muted">Running...</span>
              )}
            </div>
          );
        })}
      </div>

      {isRunning && (
        <p className="text-xs text-center text-muted pt-2">
          Analysis in progress. This may take a few moments...
        </p>
      )}
    </div>
  );
}
