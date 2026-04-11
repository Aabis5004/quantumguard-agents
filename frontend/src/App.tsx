import { useEffect, useState } from "react";
import { scanContract, listProjects, type OrchestratedReport, type ProjectListItem } from "./lib/api";

const RAILWAY_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const EXAMPLE_INPUTS = [
  "0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A",
  "https://github.com/Aabis5004/quantumguard-agents",
  "QuantumGuard",
  "https://docs.arc.network",
];

export default function App() {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<OrchestratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => { refreshProjects(); }, []);

  // Rotate placeholder examples every 3s
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % EXAMPLE_INPUTS.length), 3000);
    return () => clearInterval(t);
  }, []);

  async function refreshProjects() {
    try {
      const data = await listProjects();
      setProjects(data.projects);
    } catch (e) { console.error(e); }
  }

  async function handleScan() {
    if (!input.trim()) return;
    setError(null);
    setReport(null);
    setScanning(true);
    try {
      const r = await scanContract(input.trim());
      setReport(r);
      await refreshProjects();
      setTimeout(() => {
        document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }

  function fillExample(s: string) {
    setInput(s);
  }

  return (
    <div className="min-h-screen text-white">
      <Header />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-arc-quantum/40 bg-arc-quantum/10 text-arc-quantum text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-arc-quantum animate-pulse"></span>
          QUANTUM-AWARE · BUILT FOR ARC
        </div>

        <h2 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
          Future-proof your <span className="gradient-text">Arc project</span>
        </h2>
        <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto leading-relaxed">
          Paste a contract, URL, GitHub repo, or project name. Our AI agents read the on-chain
          footprint and tell you exactly how to use Arc's stablecoin rails, post-quantum signatures,
          and Circle infrastructure.
        </p>

        <div className="glass-card p-2 flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            placeholder={`Try: ${EXAMPLE_INPUTS[placeholderIdx]}`}
            className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-sm placeholder-gray-600"
          />
          <button onClick={handleScan} disabled={scanning} className="glow-button whitespace-nowrap">
            {scanning ? "🔍 Scanning…" : "Scan with AI →"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {EXAMPLE_INPUTS.map((s, i) => (
            <button key={i} onClick={() => fillExample(s)} className="text-[10px] text-gray-500 hover:text-arc-accent transition px-2 py-1 rounded font-mono">
              {s.length > 40 ? s.slice(0, 40) + "…" : s}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 max-w-2xl mx-auto text-arc-danger text-sm bg-arc-danger/10 border border-arc-danger/30 rounded-lg p-4">
            ⚠ {error}
          </div>
        )}

        {scanning && <ScanningAnimation />}
      </section>

      {/* Report */}
      {report && (
        <section id="report" className="max-w-5xl mx-auto px-6 pb-16 scroll-mt-8">
          <ReportView report={report} onPay={() => setShowCard(true)} />
        </section>
      )}

      {/* How it works */}
      {!report && <HowItWorks />}

      {/* Recent scans */}
      {projects.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm uppercase tracking-wider text-gray-400">Recent public scans</h3>
            <span className="text-xs text-gray-600">{projects.length} project{projects.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {projects.slice(0, 6).map((p) => (
              <RecentScanCard key={p.contractAddress + p.scannedAt} project={p} />
            ))}
          </div>
        </section>
      )}

      {showCard && <AgentCardModal onClose={() => setShowCard(false)} />}

      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────
// Header with custom QuantumGuard logo
// ────────────────────────────────────────────────
function Header() {
  return (
    <header className="border-b border-arc-border/60 backdrop-blur-md sticky top-0 z-40 bg-arc-dark/70">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QuantumLogo />
          <div>
            <h1 className="text-lg font-bold leading-none">QuantumGuard</h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase mt-0.5">
              AI Auditor · Built for Arc
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-arc-success animate-pulse"></span>
          Arc Testnet · Chain 5042002
        </div>
      </div>
    </header>
  );
}

function QuantumLogo() {
  return (
    <div className="relative w-10 h-10">
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <defs>
          <linearGradient id="qg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path
          d="M20 3 L34 9 V21 C34 28 28 33.5 20 37 C12 33.5 6 28 6 21 V9 Z"
          fill="url(#qg-grad)"
          opacity="0.18"
          stroke="url(#qg-grad)"
          strokeWidth="1.5"
        />
        <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill="url(#qg-grad)" fontFamily="system-ui">
          Q
        </text>
      </svg>
      <div className="absolute inset-0 rounded-lg bg-arc-quantum/20 blur-xl -z-10"></div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Scanning loader
// ────────────────────────────────────────────────
function ScanningAnimation() {
  const steps = [
    "Resolving input…",
    "Reading on-chain footprint…",
    "Checking quantum exposure…",
    "Asking Gemini for suggestions…",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-8 text-sm text-gray-400 flex items-center justify-center gap-3">
      <span className="inline-block w-2 h-2 rounded-full bg-arc-accent animate-ping"></span>
      <span className="font-mono">{steps[step]}</span>
    </div>
  );
}

// ────────────────────────────────────────────────
// "How it works" section
// ────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: "🔍", title: "Resolve", desc: "Paste a contract address, URL, GitHub repo, or project name. Our agent figures out what to scan." },
    { icon: "📡", title: "Read on-chain", desc: "We fetch live bytecode, balances, transaction count, and signature exposure directly from Arc Testnet RPC." },
    { icon: "🛡️", title: "Quantum check", desc: "We flag every address whose public key is exposed and at risk from harvest-now-decrypt-later attacks." },
    { icon: "🧠", title: "AI advisory", desc: "Gemini generates 5–8 Arc-native suggestions: stablecoin rails, post-quantum migration, gas, privacy, and DevX." },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 pb-20">
      <h3 className="text-center text-sm uppercase tracking-wider text-gray-400 mb-8">How QuantumGuard works</h3>
      <div className="grid md:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="glass-card p-5 text-center">
            <div className="text-3xl mb-3 float-anim" style={{ animationDelay: `${i * 0.3}s` }}>{s.icon}</div>
            <h4 className="font-bold text-sm mb-2 text-arc-accent">{i + 1}. {s.title}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────
// Recent scan card
// ────────────────────────────────────────────────
function RecentScanCard({ project }: { project: ProjectListItem }) {
  return (
    <div className="glass-card p-4 hover:border-arc-accent/50 transition cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-[10px] text-gray-500 truncate flex-1 group-hover:text-arc-accent transition">
          {project.contractAddress}
        </div>
        <div className="flex gap-2 ml-2">
          <MiniBadge label="ARC" score={project.arc_fit_score} kind="fit" />
          <MiniBadge label="QR" score={project.quantum_risk_score} kind="risk" />
        </div>
      </div>
      <div className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{project.summary}</div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-gray-600">
        <span>{project.suggestion_count} suggestions</span>
        <span>{new Date(project.scannedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function MiniBadge({ label, score, kind }: { label: string; score: number; kind: "fit" | "risk" }) {
  const isHigh = score >= 70;
  const isMid = score >= 40 && score < 70;
  const color =
    kind === "risk"
      ? isHigh ? "text-arc-danger border-arc-danger/40" : isMid ? "text-arc-warning border-arc-warning/40" : "text-arc-success border-arc-success/40"
      : isHigh ? "text-arc-success border-arc-success/40" : isMid ? "text-arc-warning border-arc-warning/40" : "text-arc-danger border-arc-danger/40";
  return (
    <div className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${color}`}>
      {label} {score}
    </div>
  );
}

// ────────────────────────────────────────────────
// Report view
// ────────────────────────────────────────────────
function ReportView({ report, onPay }: { report: any; onPay: () => void }) {
  const product = report.product;
  const strategy = report.strategy;
  const tech = report.tech;
  const onchain = report.onchain;

  return (
    <div className="space-y-6">
      {/* Agent timeline */}
      <div className="glass-card p-4">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
          🎼 Multi-agent orchestration · {report.durationMs}ms
        </div>
        <div className="flex flex-wrap gap-2">
          {report.agentsRun.map((a: string) => (
            <span key={a} className="text-[10px] px-2 py-1 rounded bg-arc-accent/10 border border-arc-accent/30 text-arc-accent uppercase">
              ✓ {a}
            </span>
          ))}
        </div>
      </div>

      {/* Product card */}
      {product && (
        <div className="glass-card p-6">
          <div className="text-[10px] text-gray-500 uppercase mb-2">🧠 Product Agent</div>
          <h2 className="text-2xl font-bold mb-1">{product.project_name}</h2>
          <p className="text-arc-accent text-sm mb-4">{product.one_liner}</p>
          <p className="text-gray-300 text-sm mb-3">{product.what_it_does}</p>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div><span className="text-gray-500">Category:</span> <span className="text-white uppercase">{product.category}</span></div>
            <div><span className="text-gray-500">Arc fit:</span> <span className="text-arc-quantum font-bold">{product.arc_fit_score}/100</span></div>
            <div><span className="text-gray-500">Target:</span> <span className="text-gray-300">{product.target_users}</span></div>
            <div><span className="text-gray-500">Chains:</span> <span className="text-gray-300">{product.detected_chains?.join(", ") || "—"}</span></div>
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">{product.arc_fit_explanation}</p>
        </div>
      )}

      {/* Strategy: top 3 recommendations */}
      {strategy && strategy.top_3_recommendations?.length > 0 && (
        <div className="glass-card p-6 border-arc-quantum/40 bg-arc-quantum/5">
          <div className="text-[10px] text-arc-quantum uppercase mb-3">🎯 Strategy Agent · Top 3 actions</div>
          <p className="text-gray-300 text-sm mb-5 italic">{strategy.executive_summary}</p>
          <div className="space-y-3">
            {strategy.top_3_recommendations.map((r: any, i: number) => (
              <div key={i} className="border border-arc-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-arc-accent font-bold text-lg">{i + 1}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{r.title}</h4>
                    <p className="text-xs text-gray-400 mb-1"><span className="text-gray-600">Why:</span> {r.why}</p>
                    <p className="text-xs text-arc-accent mb-1"><span className="text-gray-600">How:</span> {r.how}</p>
                    <p className="text-[10px] text-gray-600 uppercase">{r.arc_feature}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {strategy.migration_roadmap?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-arc-border">
              <div className="text-[10px] text-gray-500 uppercase mb-2">📅 Migration roadmap</div>
              <ol className="text-xs text-gray-300 space-y-1">
                {strategy.migration_roadmap.map((step: string, i: number) => (
                  <li key={i}>• {step}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="mt-3 text-[10px] text-gray-500">
            Effort: <span className="text-arc-warning uppercase">{strategy.estimated_effort}</span>
          </div>
        </div>
      )}

      {/* Tech report (if contract was analyzed) */}
      {tech && tech.suggestions?.length > 0 && (
        <div className="glass-card p-6">
          <div className="text-[10px] text-gray-500 uppercase mb-3">⛓️ Tech Agent · {tech.suggestions.length} suggestions</div>
          <p className="text-sm text-gray-300 mb-4">{tech.project_summary}</p>
          <div className="space-y-2">
            {tech.suggestions.slice(0, 5).map((s: any, i: number) => (
              <div key={i} className="text-xs border border-arc-border rounded p-3">
                <div className="font-bold text-white">{s.title}</div>
                <div className="text-arc-accent">→ {s.fix}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-chain card */}
      {onchain && (
        <div className="glass-card p-4 text-xs text-gray-400">
          <div className="text-[10px] uppercase text-gray-500 mb-2">📡 On-chain footprint</div>
          <div className="font-mono break-all text-[10px] mb-2">{onchain.address}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>Bytecode: {onchain.bytecodeSize} bytes</div>
            <div>Tx count: {onchain.txCount}</div>
            <div>Balance: {onchain.balance}</div>
            <div>Quantum exposed: {onchain.exposedPublicKey ? "⚠️ yes" : "✅ no"}</div>
          </div>
        </div>
      )}

      {/* Pay CTA */}
      <div className="glass-card p-6 text-center bg-gradient-to-br from-arc-quantum/10 to-arc-accent/10">
        <h3 className="font-bold text-lg mb-2">Want code-level deep audit?</h3>
        <p className="text-sm text-gray-400 mb-4">Unlock vision agent (reads screenshots), security findings, custom migration script — 0.10 USDC.</p>
        <button onClick={onPay} className="glow-button">💳 Pay with AgentCard</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// AgentCard modal with flip
// ────────────────────────────────────────────────
function AgentCardModal({ onClose }: { onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    setFlipped(true);
    setPaying(true);
    setTimeout(() => {
      alert("Phase C will wire this to the real on-chain payForReport() call via MetaMask + USDC approval.");
      setPaying(false);
      setFlipped(false);
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="glass-card p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">AgentCard Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="card-3d h-56 mb-6">
          <div className={`card-flip-inner h-full ${flipped ? "flipped" : ""}`}>
            {/* Front */}
            <div className="card-face">
              <div className="bg-gradient-to-br from-arc-accent2 via-arc-quantum to-arc-accent rounded-2xl p-6 text-white shadow-2xl h-full flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-black/10 blur-2xl"></div>
                <div className="flex justify-between relative">
                  <div className="text-xs opacity-90 font-bold tracking-wider">QUANTUMGUARD</div>
                  <div className="text-xs font-bold">USDC</div>
                </div>
                <div className="font-mono text-xl tracking-widest relative">
                  •••• •••• •••• 4242
                </div>
                <div className="flex justify-between items-end text-xs relative">
                  <div>
                    <div className="opacity-60 text-[9px] tracking-wider">CARD HOLDER</div>
                    <div className="font-medium">AGENT TREASURY</div>
                  </div>
                  <div className="text-right">
                    <div className="opacity-60 text-[9px] tracking-wider">AMOUNT</div>
                    <div className="font-bold text-base">0.10 USDC</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Back */}
            <div className="card-face card-back">
              <div className="bg-gradient-to-br from-arc-quantum to-arc-accent2 rounded-2xl h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2 spin-slow inline-block">⚡</div>
                  <div className="text-sm">{paying ? "Submitting…" : "Confirmed"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handlePay} disabled={paying} className="glow-button w-full">
          {paying ? "Processing…" : "Confirm Payment"}
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-3">
          Powered by Circle USDC on Arc Testnet · Sub-second finality
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-arc-border/60 mt-10">
      <div className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 text-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <QuantumLogo />
            <span className="font-bold">QuantumGuard</span>
          </div>
          <p className="text-gray-500">AI-powered auditor for the Agentic Economy on Arc.</p>
        </div>
        <div>
          <div className="text-gray-500 uppercase mb-2">Live infrastructure</div>
          <ul className="space-y-1 text-gray-400">
            <li>📡 <a href={`${RAILWAY_URL}/api/health`} target="_blank" rel="noreferrer" className="hover:text-arc-accent">API health</a></li>
            <li>📜 <a href="https://testnet.arcscan.app/address/0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A" target="_blank" rel="noreferrer" className="hover:text-arc-accent">Contract on Arcscan</a></li>
            <li>✅ <a href="https://repo.sourcify.dev/5042002/0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A" target="_blank" rel="noreferrer" className="hover:text-arc-accent">Verified source</a></li>
          </ul>
        </div>
        <div>
          <div className="text-gray-500 uppercase mb-2">Built with</div>
          <ul className="space-y-1 text-gray-400">
            <li>⚡ Arc Testnet (Chain 5042002)</li>
            <li>💵 USDC as gas</li>
            <li>🧠 Google Gemini</li>
            <li>📦 React + Vite + Tailwind</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-arc-border/60 py-4 text-center text-[10px] text-gray-600">
        Built for the Agentic Economy on Arc Hackathon · April 2026 · QuantumGuard is an independent project, not affiliated with or endorsed by Circle.
      </div>
    </footer>
  );
}
