import { useState, useCallback, useRef, useEffect } from "react";
import type { SSEProgressEvent, SSECompleteEvent, SSEErrorEvent } from "shared";

export interface SSECallbacks<T> {
  onProgress?: (event: SSEProgressEvent) => void;
  onComplete?: (data: T) => void;
  onError?: (error: SSEErrorEvent) => void;
}

export interface UseSSEResult<T> {
  start: () => void;
  cancel: () => void;
  isRunning: boolean;
  progress: SSEProgressEvent[];
  result: T | null;
  error: SSEErrorEvent | null;
}

interface UseSSEOptions<T> extends SSECallbacks<T> {
  method?: "GET" | "POST";
  body?: unknown;
}

/**
 * Parse SSE events from a chunk of text.
 * SSE format: "data: {...}\n\n"
 */
function parseSSEEvents(chunk: string): Array<SSEProgressEvent | SSECompleteEvent<unknown> | SSEErrorEvent> {
  const events: Array<SSEProgressEvent | SSECompleteEvent<unknown> | SSEErrorEvent> = [];
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6).trim();
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          events.push(parsed);
        } catch {
          // Skip malformed JSON
          console.warn("Failed to parse SSE event:", jsonStr);
        }
      }
    }
  }

  return events;
}

/**
 * Run a fetch request with SSE streaming.
 * Returns a cancel function.
 */
export async function runSSEFetch<T>(
  url: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    onProgress?: (event: SSEProgressEvent) => void;
    onComplete?: (data: T) => void;
    onError?: (error: SSEErrorEvent) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  const { method = "POST", body, onProgress, onComplete, onError, signal } = options;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      signal,
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Request failed",
        code: "UNKNOWN",
      }));
      onError?.({
        type: "error",
        code: errorData.code || "HTTP_ERROR",
        message: errorData.error || `HTTP ${response.status}`,
      });
      return;
    }

    if (!response.body) {
      onError?.({
        type: "error",
        code: "NO_BODY",
        message: "Response has no body",
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete events (separated by double newlines)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || ""; // Keep incomplete part in buffer

      for (const part of parts) {
        const events = parseSSEEvents(part);
        for (const event of events) {
          if (event.type === "progress") {
            onProgress?.(event);
          } else if (event.type === "complete") {
            onComplete?.((event as SSECompleteEvent<T>).data);
          } else if (event.type === "error") {
            onError?.(event);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const events = parseSSEEvents(buffer);
      for (const event of events) {
        if (event.type === "progress") {
          onProgress?.(event);
        } else if (event.type === "complete") {
          onComplete?.((event as SSECompleteEvent<T>).data);
        } else if (event.type === "error") {
          onError?.(event);
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // Request was cancelled, don't call onError
      return;
    }
    onError?.({
      type: "error",
      code: "FETCH_ERROR",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * React hook for SSE-based streaming requests.
 */
export function useSSE<T>(url: string, options?: UseSSEOptions<T>): UseSSEResult<T> {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SSEProgressEvent[]>([]);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<SSEErrorEvent | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a stable key for options to avoid unnecessary re-renders
  const optionsKey = JSON.stringify({
    method: options?.method,
    body: options?.body,
  });

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    // Cancel any existing request
    cancel();

    // Reset state
    setProgress([]);
    setResult(null);
    setError(null);
    setIsRunning(true);

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    runSSEFetch<T>(url, {
      method: options?.method,
      body: options?.body,
      signal: abortController.signal,
      onProgress: (event) => {
        setProgress((prev) => {
          const next = [...prev, event];
          // Keep last 50 events to prevent memory bloat
          return next.length > 50 ? next.slice(-50) : next;
        });
        options?.onProgress?.(event);
      },
      onComplete: (data) => {
        setResult(data);
        setIsRunning(false);
        options?.onComplete?.(data);
      },
      onError: (err) => {
        setError(err);
        setIsRunning(false);
        options?.onError?.(err);
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
  }, [url, optionsKey, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    start,
    cancel,
    isRunning,
    progress,
    result,
    error,
  };
}

export default useSSE;
