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
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line text-[11px] text-ink-muted mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-1"></span>
          Built for the Agentic Economy on Arc
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
          Audit any Arc project<br />
          <span className="text-ink-muted">in seconds.</span>
        </h1>
        <p className="text-lg text-ink-muted max-w-xl mx-auto mb-10 leading-relaxed">
          Paste a contract, URL, or GitHub repo. Our AI agents read the on-chain footprint and tell you exactly how to use Arc's stablecoin rails, post-quantum signatures, and Circle infrastructure.
        </p>
        <div className="bg-bg-elev border border-line rounded-2xl p-2 flex gap-2 max-w-2xl mx-auto shadow-soft">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            className="flex-1 bg-transparent px-4 py-3 text-sm placeholder-ink-dim focus:outline-none"
            placeholder="0x... or https://yourproject.com" />
          <button onClick={handleScan} disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-ink transition disabled:opacity-40">
            {loading ? "Scanning…" : "Scan with AI"}
          </button>
        </div>
        {error && <div className="mt-4 text-sm text-bad">{error}</div>}
        <div className="mt-6 text-[11px] text-ink-dim">
          Try: <button onClick={() => setInput("https://docs.arc.network")} className="hover:text-brand-1">docs.arc.network</button>
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
