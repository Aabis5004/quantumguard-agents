const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface Suggestion {
  title: string; category: string; severity: "critical"|"high"|"medium"|"low";
  problem: string; fix: string; arc_feature_used: string; estimated_impact: string;
}
export interface AIReport {
  project_summary: string; arc_fit_score: number; quantum_risk_score: number;
  suggestions: Suggestion[];
  quantum_migration_plan: { urgency: string; exposed_addresses: string[]; recommended_action: string|string[]; signature_scheme: string; size_tradeoff_note: string; };
}
export interface ResolvedInput {
  kind: "address"|"url"|"github"|"name";
  contractAddress: string|null; sourceText: string;
  confidence: "high"|"medium"|"low"; notes: string; hint?: string;
}
export interface ProductAnalysis {
  project_name: string; one_liner: string; what_it_does: string;
  target_users: string; value_prop: string; category: string;
  detected_chains: string[]; arc_fit_score: number;
  arc_fit_explanation: string;
  what_they_should_focus_on: string[];
  security_concerns: string[];
  arc_specific_improvements: string[];
  notes: string;
}
export interface UnifiedStrategy {
  executive_summary: string;
  top_3_recommendations: Array<{title:string; why:string; how:string; arc_feature:string;}>;
  product_improvements: string[];
  security_action_items: string[];
  arc_migration_steps: string[];
  migration_roadmap: string[];
  estimated_effort: "low"|"medium"|"high";
  business_impact: string;
}
export interface OrchestratedReport {
  input: string;
  resolved: ResolvedInput;
  crawled: any | null;
  product: ProductAnalysis | null;
  onchain: { address: string; bytecodeSize: number; hasCode: boolean; balance: string; txCount: number; exposedPublicKey: boolean; } | null;
  tech: AIReport | null;
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
