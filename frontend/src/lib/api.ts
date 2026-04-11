const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface ProductAnalysis {
  project_name: string;
  one_liner: string;
  category: string;
  arc_fit_score: number;
  arc_fit_reason: string;
  missing_arc_features: Array<{ feature: string; why_it_matters: string; how_to_add: string }>;
  arc_improvements: string[];
  security_gotchas_on_arc: string[];
  notes: string;
}

export interface UnifiedStrategy {
  one_line_verdict: string;
  arc_score: number;
  do_this_first: { title: string; steps: string[]; arc_feature: string };
  arc_improvements: Array<{ title: string; what: string; arc_feature: string }>;
  security_checklist: string[];
  effort: "low" | "medium" | "high";
}

export interface OrchestratedReport {
  input: string;
  resolved: any;
  crawled: any;
  product: ProductAnalysis | null;
  onchain: any;
  tech: any;
  strategy: UnifiedStrategy | null;
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
