import type { PeecData } from "./claude.js";

// Peec AI REST API Configuration
const API_BASE_URL = "https://api.peec.ai/customer/v1";

export interface PeecConfig {
  apiKey?: string;
  projectId?: string;
}

// Lazy initialization - don't read env vars at module load time
let config: PeecConfig | null = null;

function getConfig(): PeecConfig {
  if (!config) {
    config = {
      apiKey: process.env.PEEC_API_KEY,
      projectId: process.env.PEEC_PROJECT_ID,
    };
  }
  return config;
}

export function configurePeec(newConfig: Partial<PeecConfig>) {
  config = { ...getConfig(), ...newConfig };
}

export function isPeecConfigured(): boolean {
  const cfg = getConfig();
  return !!cfg.apiKey && !!cfg.projectId;
}

// Helper to make API requests
async function apiRequest(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const cfg = getConfig();

  if (!cfg.apiKey) {
    throw new Error("PEEC_API_KEY not configured. Set it in your .env file.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": cfg.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Peec API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Helper for GET requests
async function apiGet(endpoint: string): Promise<unknown> {
  const cfg = getConfig();

  if (!cfg.apiKey) {
    throw new Error("PEEC_API_KEY not configured. Set it in your .env file.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "X-API-Key": cfg.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Peec API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Get date range for last 30 days
function getDateRange(): { start_date: string; end_date: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  };
}

export async function fetchBrandReport(brandName: string): Promise<unknown> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  const { start_date, end_date } = getDateRange();

  try {
    const result = await apiRequest("/reports/brands", {
      project_id: getConfig().projectId,
      start_date,
      end_date,
    });

    return result;
  } catch (error) {
    console.error("Error fetching brand report:", error);
    throw error;
  }
}

export async function fetchDomainReport(domain: string): Promise<unknown> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  const { start_date, end_date } = getDateRange();

  try {
    const result = await apiRequest("/reports/domains", {
      project_id: getConfig().projectId,
      start_date,
      end_date,
      limit: 20,
    });

    return result;
  } catch (error) {
    console.error("Error fetching domain report:", error);
    throw error;
  }
}

export async function fetchUrlReport(): Promise<unknown> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  const { start_date, end_date } = getDateRange();

  try {
    const result = await apiRequest("/reports/urls", {
      project_id: getConfig().projectId,
      start_date,
      end_date,
      limit: 20,
    });

    return result;
  } catch (error) {
    console.error("Error fetching URL report:", error);
    throw error;
  }
}

export async function fetchSearchQueries(brandName: string): Promise<unknown[]> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  try {
    const result = await apiRequest("/queries/search", {
      project_id: getConfig().projectId,
      limit: 20,
    }) as { rows?: unknown[] };

    return result.rows || [];
  } catch (error) {
    console.error("Error fetching search queries:", error);
    throw error;
  }
}

export async function fetchChats(brandName: string): Promise<unknown[]> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  try {
    // Use GET endpoint for listing chats
    const result = await apiGet(`/chats?project_id=${getConfig().projectId}&limit=10`) as { rows?: unknown[] };

    return result.rows || [];
  } catch (error) {
    console.error("Error fetching chats:", error);
    // Return empty array if chats endpoint isn't available
    return [];
  }
}

export async function fetchChatContent(chatId: string): Promise<unknown> {
  if (!isPeecConfigured()) {
    throw new Error("Peec AI not configured. Set PEEC_API_KEY and PEEC_PROJECT_ID in .env");
  }

  try {
    const result = await apiGet(`/chats/${chatId}`);
    return result;
  } catch (error) {
    console.error("Error fetching chat content:", error);
    throw error;
  }
}

export async function fetchPeecData(brandName: string, domain: string): Promise<PeecData> {
  // Fetch all data in parallel
  const [brandReport, domainReport, urlReport, chats, searchQueries] = await Promise.all([
    fetchBrandReport(brandName),
    fetchDomainReport(domain),
    fetchUrlReport(),
    fetchChats(brandName),
    fetchSearchQueries(brandName),
  ]);

  // Fetch content for first few chats to get sample AI responses
  const chatContents: unknown[] = [];
  const chatList = chats as Array<{ id?: string }>;
  const chatIds = chatList.slice(0, 3).map(c => c.id).filter(Boolean) as string[];

  for (const chatId of chatIds) {
    try {
      const content = await fetchChatContent(chatId);
      chatContents.push(content);
    } catch (error) {
      console.error(`Error fetching chat ${chatId}:`, error);
    }
  }

  return {
    brandReport,
    domainReport,
    urlReport,
    chats,
    chatContents,
    searchQueries,
  };
}

// No longer needed - REST API doesn't require disconnect
export async function disconnectPeec(): Promise<void> {
  // No-op for REST API
}
