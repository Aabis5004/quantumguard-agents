// API client for the QuantumGuard backend

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface Suggestion {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  problem: string;
  fix: string;
  arc_feature_used: string;
  estimated_impact: string;
}

export interface QuantumMigrationPlan {
  urgency: string;
  exposed_addresses: string[];
  recommended_action: string | string[];
  signature_scheme: string;
  size_tradeoff_note: string;
}

export interface AIReport {
  project_summary: string;
  arc_fit_score: number;
  quantum_risk_score: number;
  suggestions: Suggestion[];
  quantum_migration_plan: QuantumMigrationPlan;
}

export interface ResolvedInput {
  kind: "address" | "url" | "github" | "name";
  contractAddress: string | null;
  sourceText: string;
  confidence: "high" | "medium" | "low";
  notes: string;
  hint?: string;
}

export interface FullReport {
  contractAddress: string;
  scannedAt: string;
  resolved?: ResolvedInput;
  onchain: {
    address: string;
    bytecodeSize: number;
    hasCode: boolean;
    balance: string;
    txCount: number;
    exposedPublicKey: boolean;
  };
  ai: AIReport;
}

export interface ProjectListItem {
  contractAddress: string;
  scannedAt: string;
  arc_fit_score: number;
  quantum_risk_score: number;
  summary: string;
  suggestion_count: number;
}

export async function scanContract(input: string): Promise<FullReport> {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const baseMsg = err.error || err.message || `Scan failed (${res.status})`;
    const hint = err.resolved?.hint;
    const notes = err.resolved?.notes;
    let fullMsg = baseMsg;
    if (notes) fullMsg += ` — ${notes}`;
    if (hint) fullMsg += ` 💡 ${hint}`;
    throw new Error(fullMsg);
  }
  return res.json();
}

export async function listProjects(): Promise<{ count: number; projects: ProjectListItem[] }> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
}

export async function getReport(address: string): Promise<FullReport> {
  const res = await fetch(`${API_BASE}/api/report/${address}`);
  if (!res.ok) throw new Error("Report not found");
  return res.json();
}
