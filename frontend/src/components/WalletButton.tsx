import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { useState } from "react";
import { arcTestnet } from "../lib/web3";
import AgentCardPanel from "./AgentCardPanel";

export default function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") || connectors[0];
    return (
      <button onClick={() => connect({ connector: injected })} disabled={isPending}
        className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-black font-bold hover:shadow-lg hover:shadow-violet-500/30 transition disabled:opacity-50">
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== arcTestnet.id) {
    return (
      <button onClick={() => switchChain({ chainId: arcTestnet.id })}
        className="text-xs px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
        ⚠ Switch to Arc Testnet
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="group text-xs px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 transition font-mono flex items-center gap-2"
        title="Open wallet">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span className="text-slate-200">{address!.slice(0, 6)}…{address!.slice(-4)}</span>
        <span className="text-slate-500 group-hover:text-cyan-400 transition">→</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="min-h-screen flex items-start justify-center p-4 pt-20" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-2xl w-full">
              <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-cyan-400 mb-4 flex items-center gap-2">← Close</button>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">Your AgentCard</h1>
              <p className="text-slate-400 text-sm mb-6">Non-custodial USDC vault on Arc Testnet. Send and receive by wallet address or card number.</p>
              <AgentCardPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
