import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { Link } from "react-router-dom";
import { arcTestnet } from "../lib/web3";

export default function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") || connectors[0];
    return (
      <button onClick={() => connect({ connector: injected })} disabled={isPending}
        className="text-xs px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-ink transition disabled:opacity-50">
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== arcTestnet.id) {
    return (
      <button onClick={() => switchChain({ chainId: arcTestnet.id })}
        className="text-xs px-4 py-2 rounded-lg bg-warn/10 border border-warn/40 text-warn">
        ⚠ Switch to Arc Testnet
      </button>
    );
  }

  return (
    <Link to="/wallet"
      className="group text-xs px-4 py-2 rounded-lg bg-bg-elev border border-line hover:border-brand-1/50 transition font-mono flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-ok"></span>
      <span className="text-ink">{address!.slice(0, 6)}…{address!.slice(-4)}</span>
      <span className="text-ink-dim group-hover:text-brand-1 transition">→</span>
    </Link>
  );
}
