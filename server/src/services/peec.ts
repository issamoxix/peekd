import type { PeecData } from "./claude.js";

// For now, we'll use mock data since actual MCP connection requires OAuth
// The real implementation would use @modelcontextprotocol/sdk

export interface PeecConfig {
  useMock: boolean;
  // These would be used for real MCP connection
  accessToken?: string;
  refreshToken?: string;
}

let config: PeecConfig = {
  useMock: true,
};

export function configurePeec(newConfig: Partial<PeecConfig>) {
  config = { ...config, ...newConfig };
}

export function isPeecConfigured(): boolean {
  return config.useMock || !!config.accessToken;
}

// Mock data for development
function generateMockBrandReport(brandName: string): unknown {
  return {
    brand: brandName,
    visibility: 0.45,
    sentiment: 72,
    share_of_voice: 0.18,
    position: 3.2,
    mentions_by_model: {
      ChatGPT: { mentions: 12, sentiment: 74 },
      Perplexity: { mentions: 8, sentiment: 70 },
      Gemini: { mentions: 5, sentiment: 68 },
    },
    date_range: "Last 30 days",
  };
}

function generateMockDomainReport(domain: string): unknown {
  return {
    domain,
    domains_cited: [
      { domain: "wikipedia.org", citation_rate: 0.82, group_type: "REFERENCE" },
      { domain: "techcrunch.com", citation_rate: 0.45, group_type: "EDITORIAL" },
      { domain: "g2.com", citation_rate: 0.38, group_type: "UGC" },
      { domain: domain, citation_rate: 0.22, group_type: "OWNED" },
      { domain: "forbes.com", citation_rate: 0.15, group_type: "EDITORIAL" },
    ],
    gap_opportunities: [
      { competitor: "Competitor A", domains_citing_them: ["capterra.com", "softwareadvice.com"] },
    ],
  };
}

function generateMockChats(brandName: string): unknown[] {
  return [
    {
      id: "chat-1",
      model: "ChatGPT",
      query: `What is ${brandName}?`,
      response: `${brandName} is a software company that provides solutions in their market segment. They are known for their product offerings and have been growing their customer base.`,
      brand_mentioned: true,
      sentiment: 72,
      created_at: new Date().toISOString(),
    },
    {
      id: "chat-2",
      model: "Perplexity",
      query: `Best alternatives to ${brandName}`,
      response: `When looking for alternatives to ${brandName}, consider these options based on your specific needs...`,
      brand_mentioned: true,
      sentiment: 68,
      created_at: new Date().toISOString(),
    },
    {
      id: "chat-3",
      model: "Gemini",
      query: `${brandName} reviews`,
      response: `${brandName} has received mixed reviews from users. Some praise the ease of use while others mention the learning curve.`,
      brand_mentioned: true,
      sentiment: 65,
      created_at: new Date().toISOString(),
    },
  ];
}

function generateMockSearchQueries(brandName: string): unknown[] {
  return [
    { query: `best ${brandName} alternatives`, frequency: 45, brand_position: 2 },
    { query: `${brandName} vs competitor`, frequency: 32, brand_position: 1 },
    { query: `${brandName} pricing`, frequency: 28, brand_position: 1 },
    { query: `is ${brandName} worth it`, frequency: 18, brand_position: 3 },
    { query: `${brandName} features`, frequency: 15, brand_position: 1 },
  ];
}

export async function fetchPeecData(brandName: string, domain: string): Promise<PeecData> {
  if (config.useMock) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      brandReport: generateMockBrandReport(brandName),
      domainReport: generateMockDomainReport(domain),
      chats: generateMockChats(brandName),
      searchQueries: generateMockSearchQueries(brandName),
    };
  }

  // Real MCP implementation would go here
  // This requires OAuth setup and @modelcontextprotocol/sdk
  throw new Error("Real MCP connection not yet implemented. Set useMock: true in config.");
}

// Individual fetch functions for SSE progress reporting
export async function fetchBrandReport(brandName: string): Promise<unknown> {
  if (config.useMock) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockBrandReport(brandName);
  }
  throw new Error("Real MCP not implemented");
}

export async function fetchDomainReport(domain: string): Promise<unknown> {
  if (config.useMock) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockDomainReport(domain);
  }
  throw new Error("Real MCP not implemented");
}

export async function fetchChats(brandName: string): Promise<unknown[]> {
  if (config.useMock) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return generateMockChats(brandName);
  }
  throw new Error("Real MCP not implemented");
}

export async function fetchSearchQueries(brandName: string): Promise<unknown[]> {
  if (config.useMock) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return generateMockSearchQueries(brandName);
  }
  throw new Error("Real MCP not implemented");
}
