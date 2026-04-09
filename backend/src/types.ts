// Shared types used by every agent and the API

export interface ProjectInput {
  contractAddress: string;
  network: "Arc_Testnet";
}

export interface OnchainData {
  address: string;
  bytecodeSize: number;
  hasCode: boolean;
  balance: string;
  txCount: number;
  age: string;
  exposedPublicKey: boolean;
}

export interface Suggestion {
  title: string;
  category:
    | "arc-native"
    | "stablecoin"
    | "agent"
    | "quantum"
    | "privacy"
    | "gas"
    | "devx";
  severity: "critical" | "high" | "medium" | "low";
  problem: string;
  fix: string;
  arc_feature_used: string;
  estimated_impact: string;
}

export interface QuantumMigrationPlan {
  urgency: "immediate" | "6-months" | "12-months" | "monitor";
  exposed_addresses: string[];
  recommended_action: string;
  signature_scheme: "ML-DSA" | "Falcon";
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
}

export interface FullReport {
  contractAddress: string;
  scannedAt: string;
  resolved?: ResolvedInput;
  onchain: OnchainData;
  ai: AIReport;
}
