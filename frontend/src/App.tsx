import { useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import WalletButton from "./components/WalletButton";
import QuantumLogo from "./components/QuantumLogo";
import AgentCardPanel from "./components/AgentCardPanel";

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-ink font-sans antialiased">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-line/60 bg-bg/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <QuantumLogo />
          <div>
            <h1 className="text-base font-semibold leading-none tracking-tight">QuantumGuard</h1>
            <p className="text-[10px] text-ink-dim tracking-wider uppercase mt-1">AI Auditor for Arc</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-ok"></span>
            Arc Testnet
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function HomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleScan() {
    if (!input.trim()) return;
    setLoading(true); setError(null);
    try {
      const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";
      const res = await fetch(`${API}/api/scan-deep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const r = await res.json();
      sessionStorage.setItem("lastReport", JSON.stringify(r));
      navigate("/report");
    } catch (e: any) {
      setError(e.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="relative w-full max-w-5xl mx-auto pt-24 pb-16 px-6 text-center">
        {/* Background radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          Audit Arc with <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A050FF] to-[#00D1FF] glow-text">
            Quantum Precision
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light">
          Autonomous AI agents that scan Arc Testnet, audit live projects, and provide concrete, post-quantum migration specs.
        </p>

        {/* The Command Input (Search Bar) */}
        <div className="relative max-w-3xl mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#A050FF] to-[#00D1FF] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-[#100A1A] border border-white/10 rounded-2xl p-2 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="m-4 text-purple-400" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input 
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="Enter Arc Contract Address (e.g. 0x49eD...)"
              className="w-full bg-transparent border-none text-white text-lg placeholder-gray-600 focus:outline-none focus:ring-0 px-2"
            />
            <button onClick={handleScan} disabled={loading || !input.trim()} className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg>
              {loading ? "Scanning…" : "Scan"}
            </button>
          </div>
        </div>
        {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

        {/* Quick suggestions area */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="text-sm text-gray-500 mr-2 self-center">Try scanning:</span>
          <button onClick={() => setInput("https://docs.arc.network")} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-sm text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all">
            docs.arc.network
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-[11px] tracking-widest text-ink-dim uppercase text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { n: "01", t: "Resolve", d: "Paste any input — contract, URL, repo. We figure out what to scan." },
            { n: "02", t: "Read on-chain", d: "Live bytecode, balances, tx count from Arc Testnet RPC." },
            { n: "03", t: "Quantum check", d: "Flag any address with exposed public keys at risk from harvest-now-decrypt-later." },
            { n: "04", t: "AI advisory", d: "5–8 Arc-native suggestions: stablecoin rails, FX, post-quantum migration." },
          ].map((s) => (
            <div key={s.n} className="bg-bg-soft border border-line rounded-xl p-5 hover:border-line-strong transition">
              <div className="text-[10px] text-ink-dim font-mono mb-3">{s.n}</div>
              <div className="text-sm font-semibold mb-1.5">{s.t}</div>
              <div className="text-xs text-ink-muted leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
    
      <section id="wallet" className="border-t border-line/60 bg-bg-soft">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-[11px] tracking-widest text-ink-dim uppercase text-center mb-4">Your AgentCard</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-3">Non-custodial USDC vault</h2>
          <p className="text-ink-muted text-sm text-center mb-10 max-w-md mx-auto">
            Send and receive by wallet address or 16-digit card number. On-chain on Arc Testnet. No custodian.
          </p>
          <AgentCardPanel />
        </div>
      </section>
    </main>
  );
}

function ReportPage() {
  const raw = typeof window !== "undefined" ? sessionStorage.getItem("lastReport") : null;
  const report = raw ? JSON.parse(raw) : null;
  if (!report) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-ink-muted">No report loaded. <Link to="/" className="text-brand-1 hover:underline">Go scan something</Link>.</p>
      </main>
    );
  }
  const product = report?.report?.product || report?.product;
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link to="/" className="text-xs text-ink-muted hover:text-brand-1 transition mb-8 inline-flex items-center gap-2">← Scan another</Link>
      <h1 className="text-3xl font-bold tracking-tight mb-2">{report.subject?.label || "Report"}</h1>
      <p className="text-ink-muted text-xs mb-10 font-mono">{report.subject?.kind || ""}</p>

      {product?.what_they_are_building && (
        <Section title="What they're building">
          <p className="text-ink-muted leading-relaxed">{product.what_they_are_building}</p>
        </Section>
      )}

      {Array.isArray(product?.what_they_did_great) && product.what_they_did_great.length > 0 && (
        <Section title="What they did great">
          <div className="space-y-3">
            {product.what_they_did_great.map((s: any, i: number) => (
              <div key={i} className="bg-bg-soft border border-line rounded-xl p-4">
                <div className="text-sm text-ink mb-1">✓ {s.observation || s}</div>
                {s.evidence && <div className="text-[11px] text-ink-dim italic">"{s.evidence}"</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {Array.isArray(product?.improvements_for_arc) && product.improvements_for_arc.length > 0 && (
        <Section title="Improvements for Arc">
          <div className="space-y-3">
            {product.improvements_for_arc.map((r: any, i: number) => (
              <div key={i} className="bg-bg-soft border border-line rounded-xl p-4">
                <div className="text-sm font-semibold mb-2">{r.title}</div>
                {r.evidence_from_site && (
                  <div className="text-[11px] text-ink-dim italic mb-2">🔍 Found in their site: "{r.evidence_from_site}"</div>
                )}
                <div className="text-xs text-ink-muted mb-2">{r.specific_change || r.what}</div>
                <div className="text-[10px] text-brand-1 uppercase tracking-wider">⚡ {r.arc_feature}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="mb-10">
      <h2 className="text-[11px] tracking-widest text-ink-dim uppercase mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 text-center text-[11px] text-ink-dim">
        <div className="flex items-center justify-center gap-2 mb-2">
          <QuantumLogo size={20} />
          <span className="font-semibold text-ink-muted">QuantumGuard</span>
        </div>
        <p>AI-powered project auditor for the Arc Testnet community.</p>
        <p className="mt-2">Independent project · Not affiliated with Circle.</p>
      </div>
    </footer>
  );
}
