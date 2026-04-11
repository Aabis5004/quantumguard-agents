const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface ProductAnalysis {
  project_name: string;
  one_liner: string;
  category: string;
  what_they_are_building: string;
  what_they_did_great: string[];
  improvements_for_arc: Array<{ title: string; what: string; arc_feature: string }>;
  arc_fit_score: number;
  notes: string;
}

export interface OrchestratedReport {
  input: string;
  resolved: any;
  crawled: { pagesCrawled?: string[] } | null;
  product: ProductAnalysis | null;
  onchain: any;
  tech: any;
  strategy: any;
  agentsRun: string[];
  durationMs: number;
}

export interface ProjectListItem {
  contractAddress: string; scannedAt: string;
  arc_fit_score: number; quantum_risk_score: number;
  summary: string; suggestion_count: number;
}

export async function scanContract(input: string): Promise<OrchestratedReport> {
  const res = await fetch(`${API_BASE}/api/scan-deep`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Scan failed (${res.status})`);
  }
  return res.json();
}

export async function listProjects(): Promise<{count:number; projects:ProjectListItem[]}> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) return { count: 0, projects: [] };
  return res.json();
}
