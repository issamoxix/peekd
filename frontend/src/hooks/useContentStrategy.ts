import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchStrategy } from "../services/api";
import { runSSEFetch, type SSECallbacks } from "./useSSE";
import type { ContentStrategy, SSEProgressEvent, SSEErrorEvent } from "shared";

const BASE_URL = "/api";

/**
 * Hook to fetch existing content strategy for a project.
 */
export function useContentStrategy(projectId: string | null) {
  return useQuery({
    queryKey: ["contentStrategy", projectId],
    queryFn: () => fetchStrategy(projectId!),
    enabled: !!projectId,
  });
}

export interface RunStrategyCallbacks extends SSECallbacks<ContentStrategy> {
  onProgress?: (event: SSEProgressEvent) => void;
  onComplete?: (data: ContentStrategy) => void;
  onError?: (error: SSEErrorEvent) => void;
}

export interface RunStrategyOptions {
  peecProjectId?: string;
}

export interface UseRunStrategyResult {
  runStrategy: (
    projectId: string,
    options?: RunStrategyOptions,
    callbacks?: RunStrategyCallbacks
  ) => void;
  cancel: () => void;
  isRunning: boolean;
  progress: SSEProgressEvent[];
  result: ContentStrategy | null;
  error: SSEErrorEvent | null;
}

/**
 * Hook to generate content strategy with SSE streaming progress.
 */
export function useRunStrategy(): UseRunStrategyResult {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SSEProgressEvent[]>([]);
  const [result, setResult] = useState<ContentStrategy | null>(null);
  const [error, setError] = useState<SSEErrorEvent | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef<RunStrategyCallbacks | undefined>(undefined);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const runStrategy = useCallback(
    (
      projectId: string,
      options?: RunStrategyOptions,
      callbacks?: RunStrategyCallbacks
    ) => {
      cancel();
      callbacksRef.current = callbacks;

      setProgress([]);
      setResult(null);
      setError(null);
      setIsRunning(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const url = `${BASE_URL}/projects/${projectId}/strategy`;

      runSSEFetch<ContentStrategy>(url, {
        method: "POST",
        body: { peecProjectId: options?.peecProjectId },
        signal: abortController.signal,
        onProgress: (event) => {
          setProgress((prev) => {
            const next = [...prev, event];
            return next.length > 20 ? next.slice(-20) : next;
          });
          callbacksRef.current?.onProgress?.(event);
        },
        onComplete: (data) => {
          setResult(data);
          setIsRunning(false);
          queryClient.invalidateQueries({ queryKey: ["contentStrategy", projectId] });
          callbacksRef.current?.onComplete?.(data);
        },
        onError: (err) => {
          setError(err);
          setIsRunning(false);
          callbacksRef.current?.onError?.(err);
        },
      }).catch((err) => {
        if (!abortControllerRef.current?.signal.aborted) {
          setError({
            type: "error",
            code: "FETCH_ERROR",
            message: err instanceof Error ? err.message : "Unknown error",
          });
          setIsRunning(false);
        }
      });
    },
    [cancel, queryClient]
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    runStrategy,
    cancel,
    isRunning,
    progress,
    result,
    error,
  };
}

/**
 * Hook to toggle quick win completion status.
 */
export function useToggleQuickWin(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quickWinId, completed }: { quickWinId: string; completed: boolean }) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(`${BASE_URL}/projects/${projectId}/strategy/quick-wins/${quickWinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update quick win");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentStrategy", projectId] });
    },
  });
}
