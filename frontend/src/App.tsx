import { useEffect, useState } from "react";
import { scanContract, listProjects, type FullReport, type ProjectListItem } from "./lib/api";

export default function App() {
  const [address, setAddress] = useState("0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A");
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    refreshProjects();
  }, []);

  async function refreshProjects() {
    try {
      const data = await listProjects();
      setProjects(data.projects);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleScan() {
    setError(null);
    setReport(null);
    setScanning(true);
    try {
      const r = await scanContract(address);
      setReport(r);
      await refreshProjects();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-arc-dark text-white">
      <header className="border-b border-arc-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-arc-accent to-arc-quantum flex items-center justify-center font-bold text-black">
              Q
            </div>
            <div>
              <h1 className="text-xl font-bold">QuantumGuard</h1>
              <p className="text-xs text-gray-400">AI Auditor for Arc Testnet</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-arc-success animate-pulse"></span>
            Arc Testnet · Chain 5042002
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-arc-accent to-arc-quantum bg-clip-text text-transparent">
          Future-proof your Arc project
        </h2>
        <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
          AI agents scan your contract and tell you exactly how to use Arc's
          stablecoin rails, post-quantum signatures, and Circle infrastructure.
        </p>

        <div className="glass-card p-2 flex gap-2 max-w-2xl mx-auto">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x... contract address on Arc Testnet"
            className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-sm"
          />
          <button onClick={handleScan} disabled={scanning} className="glow-button">
            {scanning ? "Scanning…" : "Scan with AI"}
          </button>
        </div>

        {error && <div className="mt-4 text-arc-danger text-sm">{error}</div>}
      </section>

      {report && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <ReportView report={report} onPay={() => setShowCard(true)} />
        </section>
      )}

      {projects.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">
            Recent public scans
          </h3>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.contractAddress} className="glass-card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gray-400 truncate">{p.contractAddress}</div>
                  <div className="text-sm mt-1 truncate">{p.summary}</div>
                </div>
                <div className="flex gap-3 ml-4 text-xs">
                  <ScoreBadge label="Arc fit" score={p.arc_fit_score} kind="fit" />
                  <ScoreBadge label="Quantum risk" score={p.quantum_risk_score} kind="risk" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCard && <AgentCardModal onClose={() => setShowCard(false)} />}

      <footer className="border-t border-arc-border text-xs text-gray-500 py-6 text-center">
        Built for the Agentic Economy on Arc Hackathon · April 2026
      </footer>
    </div>
  );
}

function ScoreBadge({ label, score, kind }: { label: string; score: number; kind: "fit" | "risk" }) {
  const isHigh = score >= 70;
  const isMid = score >= 40 && score < 70;
  const color =
    kind === "risk"
      ? isHigh ? "text-arc-danger" : isMid ? "text-arc-warning" : "text-arc-success"
      : isHigh ? "text-arc-success" : isMid ? "text-arc-warning" : "text-arc-danger";

  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{score}</div>
    </div>
  );
}

function ReportView({ report, onPay }: { report: FullReport; onPay: () => void }) {
  const ai = report.ai;
  const sevColor: Record<string, string> = {
    critical: "bg-arc-danger/20 text-arc-danger border-arc-danger/50",
    high: "bg-arc-warning/20 text-arc-warning border-arc-warning/50",
    medium: "bg-arc-accent/20 text-arc-accent border-arc-accent/50",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400">Contract</div>
            <div className="font-mono text-sm">{report.contractAddress}</div>
          </div>
          <div className="flex gap-6">
            <ScoreBadge label="Arc fit" score={ai.arc_fit_score} kind="fit" />
            <ScoreBadge label="Quantum risk" score={ai.quantum_risk_score} kind="risk" />
          </div>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{ai.project_summary}</p>
      </div>

      <div className="glass-card p-6 border-arc-quantum/40 bg-arc-quantum/5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🛡️</span>
          <h3 className="font-bold text-arc-quantum">Quantum Migration Plan</h3>
          <span className="ml-auto text-xs px-2 py-1 rounded bg-arc-quantum/20 uppercase">
            {ai.quantum_migration_plan.urgency}
          </span>
        </div>
        <div className="text-sm text-gray-300 space-y-2">
          <div>
            <span className="text-gray-500">Recommended scheme:</span>{" "}
            <span className="text-white font-medium">{ai.quantum_migration_plan.signature_scheme}</span>
          </div>
          <div>
            <span className="text-gray-500">Action:</span>{" "}
            {ai.quantum_migration_plan.recommended_action}
          </div>
          <div className="text-xs text-gray-500 italic mt-2">
            {ai.quantum_migration_plan.size_tradeoff_note}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
          {ai.suggestions.length} Suggestions
        </h3>
        <div className="space-y-3">
          {ai.suggestions.map((s, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-2">
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${sevColor[s.severity] || sevColor.low}`}>
                  {s.severity}
                </span>
                <h4 className="font-semibold flex-1">{s.title}</h4>
                <span className="text-[10px] text-gray-500 uppercase">{s.category}</span>
              </div>
              <p className="text-sm text-gray-400 mb-2">{s.problem}</p>
              <p className="text-sm text-arc-accent">→ {s.fix}</p>
              <div className="text-xs text-gray-500 mt-2 italic">{s.estimated_impact}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 text-center">
        <h3 className="font-bold mb-2">Want a deeper audit?</h3>
        <p className="text-sm text-gray-400 mb-4">
          Pay 0.10 USDC for a senior-level review with code-level recommendations.
        </p>
        <button onClick={onPay} className="glow-button">
          💳 Pay with AgentCard
        </button>
      </div>
    </div>
  );
}

function AgentCardModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">AgentCard Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="bg-gradient-to-br from-arc-accent2 to-arc-quantum rounded-2xl p-6 text-white shadow-2xl mb-6">
          <div className="flex justify-between mb-8">
            <div className="text-xs opacity-80">QuantumGuard</div>
            <div className="text-xs font-bold">USDC</div>
          </div>
          <div className="font-mono text-lg tracking-widest mb-6">
            •••• •••• •••• 4242
          </div>
          <div className="flex justify-between items-end text-xs">
            <div>
              <div className="opacity-60">CARD HOLDER</div>
              <div className="font-medium">AGENT TREASURY</div>
            </div>
            <div className="text-right">
              <div className="opacity-60">AMOUNT</div>
              <div className="font-bold text-lg">0.10 USDC</div>
            </div>
          </div>
        </div>

        <button
          className="glow-button w-full"
          onClick={() => {
            alert("In Phase 5 we'll wire this to the real on-chain payForReport() call!");
            onClose();
          }}
        >
          Confirm Payment
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-3">
          Powered by Circle USDC on Arc Testnet · Sub-second finality
        </p>
      </div>
    </div>
  );
}
