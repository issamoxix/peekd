import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGapAnalysis } from "../services/api";
import { runSSEFetch, type SSECallbacks } from "./useSSE";
import type { GapAnalysis, SSEProgressEvent, SSEErrorEvent } from "shared";

const BASE_URL = "/api";

/**
 * Hook to fetch existing gap analysis for a project.
 */
export function useGapAnalysis(projectId: string | null) {
  return useQuery({
    queryKey: ["gapAnalysis", projectId],
    queryFn: () => fetchGapAnalysis(projectId!),
    enabled: !!projectId,
  });
}

export interface RunAnalysisCallbacks extends SSECallbacks<GapAnalysis> {
  onProgress?: (event: SSEProgressEvent) => void;
  onComplete?: (data: GapAnalysis) => void;
  onError?: (error: SSEErrorEvent) => void;
}

export interface UseRunAnalysisResult {
  runAnalysis: (projectId: string, callbacks?: RunAnalysisCallbacks) => void;
  cancel: () => void;
  isRunning: boolean;
  progress: SSEProgressEvent[];
  result: GapAnalysis | null;
  error: SSEErrorEvent | null;
}

/**
 * Hook to run gap analysis with SSE streaming progress.
 *
 * This hook manages the state of a streaming analysis request,
 * providing progress updates, results, and error handling.
 *
 * @example
 * ```tsx
 * const { runAnalysis, isRunning, progress, result, error } = useRunAnalysis();
 *
 * const handleClick = () => {
 *   runAnalysis(projectId, {
 *     onProgress: (event) => console.log("Progress:", event.step),
 *     onComplete: (data) => console.log("Done!", data),
 *     onError: (err) => console.error("Error:", err.message),
 *   });
 * };
 * ```
 */
export function useRunAnalysis(): UseRunAnalysisResult {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SSEProgressEvent[]>([]);
  const [result, setResult] = useState<GapAnalysis | null>(null);
  const [error, setError] = useState<SSEErrorEvent | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef<RunAnalysisCallbacks | undefined>(undefined);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const runAnalysis = useCallback(
    (projectId: string, callbacks?: RunAnalysisCallbacks) => {
      // Cancel any existing request
      cancel();

      // Store callbacks for access in handlers
      callbacksRef.current = callbacks;

      // Reset state
      setProgress([]);
      setResult(null);
      setError(null);
      setIsRunning(true);

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const url = `${BASE_URL}/projects/${projectId}/analysis`;

      runSSEFetch<GapAnalysis>(url, {
        method: "POST",
        signal: abortController.signal,
        onProgress: (event) => {
          setProgress((prev) => [...prev, event]);
          callbacksRef.current?.onProgress?.(event);
        },
        onComplete: (data) => {
          setResult(data);
          setIsRunning(false);
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["gapAnalysis", projectId] });
          callbacksRef.current?.onComplete?.(data);
        },
        onError: (err) => {
          setError(err);
          setIsRunning(false);
          callbacksRef.current?.onError?.(err);
        },
      });
    },
    [cancel, queryClient]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    runAnalysis,
    cancel,
    isRunning,
    progress,
    result,
    error,
  };
}

/**
 * Standalone function to run analysis with SSE streaming.
 * Returns a cancel function.
 *
 * Use this when you need more control over the analysis lifecycle
 * or when using outside of React components.
 *
 * @example
 * ```ts
 * const cancel = await runAnalysisWithSSE(
 *   projectId,
 *   (event) => console.log("Progress:", event.step),
 *   (data) => console.log("Complete:", data),
 *   (error) => console.error("Error:", error.message)
 * );
 *
 * // Later, to cancel:
 * cancel();
 * ```
 */
export function runAnalysisWithSSE(
  projectId: string,
  onProgress: (event: SSEProgressEvent) => void,
  onComplete: (data: GapAnalysis) => void,
  onError: (error: SSEErrorEvent) => void
): () => void {
  const abortController = new AbortController();

  const url = `${BASE_URL}/projects/${projectId}/analysis`;

  runSSEFetch<GapAnalysis>(url, {
    method: "POST",
    signal: abortController.signal,
    onProgress,
    onComplete,
    onError,
  });

  // Return cancel function
  return () => abortController.abort();
}
