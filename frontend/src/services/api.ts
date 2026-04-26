import type {
  Project,
  CreateProjectRequest,
  UpdateBriefRequest,
  GapAnalysis,
  ContentStrategy,
  Snapshot,
  ApiError,
} from "shared";

const BASE_URL = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: "Request failed",
      code: "UNKNOWN",
    }));
    throw new Error(error.error);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Projects
export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${BASE_URL}/projects`);
  return handleResponse<Project[]>(response);
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects/${id}`);
  return handleResponse<Project>(response);
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function updateProject(id: string, data: UpdateBriefRequest): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/projects/${id}`, {
    method: "DELETE",
  });
  return handleResponse<void>(response);
}

// Gap Analysis (placeholder - will implement in Tab 1)
export async function fetchGapAnalysis(projectId: string): Promise<GapAnalysis | null> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/analysis`);
  if (response.status === 404) return null;
  return handleResponse<GapAnalysis>(response);
}

// Content Strategy (placeholder - will implement in Tab 2)
export async function fetchStrategy(projectId: string): Promise<ContentStrategy | null> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/strategy`);
  if (response.status === 404) return null;
  return handleResponse<ContentStrategy>(response);
}

// Snapshots (placeholder - will implement in Tab 3)
export async function fetchSnapshots(projectId: string): Promise<Snapshot[]> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/snapshots`);
  return handleResponse<Snapshot[]>(response);
}
