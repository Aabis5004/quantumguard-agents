import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { parseUnits, formatUnits, isAddress } from "viem";
import { VAULT_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../lib/web3";
import { VAULT_ABI, USDC_ABI } from "../lib/abis";

type Step = "idle" | "approving" | "depositing" | "paying" | "withdrawing" | "registering" | "sending" | "success";

export default function AgentCardPanel() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("1.00");
  const [step, setStep] = useState<Step>("idle");
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);

  // Send modal state
  const [sendTab, setSendTab] = useState<"address" | "card">("address");
  const [sendTo, setSendTo] = useState("");
  const [sendCard, setSendCard] = useState("");
  const [sendAmount, setSendAmount] = useState("0.10");
  const [sendMemo, setSendMemo] = useState("");

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "cardInfo", args: address ? [address] : undefined },
      { address: USDC_ADDRESS, abi: USDC_ABI, functionName: "balanceOf", args: address ? [address] : undefined },
      { address: USDC_ADDRESS, abi: USDC_ABI, functionName: "allowance", args: address ? [address, VAULT_ADDRESS] : undefined },
    ],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const info = data?.[0]?.result as readonly [bigint, bigint, bigint, boolean, string] | undefined;
  const usdcBalance = (data?.[1]?.result as bigint | undefined) || 0n;
  const allowance = (data?.[2]?.result as bigint | undefined) || 0n;

  const vaultBalance = info?.[0] || 0n;
  const registered = info?.[3] || false;
  const myCardNumber = info?.[4] || "----------------";

  const { writeContractAsync } = useWriteContract();
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: lastTx as `0x${string}` | undefined });

  if (!isConnected || !address) return null;

  async function tx(fn: () => Promise<`0x${string}`>, nextStep: Step, successMsg: string) {
    try {
      setStep(nextStep);
      const hash = await fn();
      setLastTx(hash);
      setStep("success");
      setTimeout(() => { setStep("idle"); refetch(); }, 3000);
    } catch (e: any) {
      console.error(e);
      alert(e.shortMessage || e.message || successMsg + " failed");
      setStep("idle");
    }
  }

  async function doDeposit() {
    const amount = parseUnits(depositAmount, USDC_DECIMALS);
    if (amount <= 0n) return;
    try {
      if (allowance < amount) {
        setStep("approving");
        const approveTx = await writeContractAsync({
          address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [VAULT_ADDRESS, amount],
        });
        setLastTx(approveTx);
        await new Promise((r) => setTimeout(r, 3000));
      }
      setStep("depositing");
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [amount],
      });
      setLastTx(hash);
      setStep("success");
      setTimeout(() => { setStep("idle"); refetch(); }, 3000);
    } catch (e: any) {
      console.error(e);
      alert(e.shortMessage || e.message || "Deposit failed");
      setStep("idle");
    }
  }

  async function doRegister() {
    await tx(
      () => writeContractAsync({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "registerCard", args: [] }),
      "registering", "Registration"
    );
  }

  async function doWithdraw() {
    if (vaultBalance === 0n) { alert("Nothing to withdraw"); return; }
    await tx(
      () => writeContractAsync({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "withdrawAll", args: [] }),
      "withdrawing", "Withdraw"
    );
  }

  async function doSend() {
    const amount = parseUnits(sendAmount, USDC_DECIMALS);
    if (amount <= 0n) { alert("Amount must be > 0"); return; }
    if (amount > vaultBalance) { alert("Insufficient vault balance"); return; }

    try {
      setStep("sending");
      let hash: `0x${string}`;
      if (sendTab === "address") {
        if (!isAddress(sendTo)) { alert("Invalid address"); setStep("idle"); return; }
        hash = await writeContractAsync({
          address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "transferInVault",
          args: [sendTo as `0x${string}`, amount, sendMemo],
        });
      } else {
        const clean = sendCard.replace(/\s/g, "");
        if (clean.length !== 16 || !/^\d{16}$/.test(clean)) { alert("Card number must be 16 digits"); setStep("idle"); return; }
        hash = await writeContractAsync({
          address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "transferByCardNumber",
          args: [clean, amount, sendMemo],
        });
      }
      setLastTx(hash);
      setStep("success");
      setShowSend(false);
      setSendTo(""); setSendCard(""); setSendMemo("");
      setTimeout(() => { setStep("idle"); refetch(); }, 3000);
    } catch (e: any) {
      console.error(e);
      alert(e.shortMessage || e.message || "Send failed");
      setStep("idle");
    }
  }

  const fmt = (v: bigint) => Number(formatUnits(v, USDC_DECIMALS)).toFixed(2);
  const formattedCard = myCardNumber.replace(/(.{4})/g, "$1 ").trim();
  const busy = step !== "idle" && step !== "success";
  const explorer = lastTx ? `https://testnet.arcscan.app/tx/${lastTx}` : "";
  const shortTx = lastTx ? `${lastTx.slice(0, 10)}…${lastTx.slice(-6)}` : "";

  return (
    <div className="glass-card p-6 bg-gradient-to-br from-arc-accent2/10 to-arc-quantum/10 border-arc-quantum/30">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] text-arc-quantum uppercase tracking-wider">💳 Your AgentCard · On-chain vault</div>
        {!registered && (
          <button onClick={doRegister} disabled={busy}
            className="text-[10px] px-2 py-1 rounded bg-arc-warning/20 border border-arc-warning/50 text-arc-warning hover:bg-arc-warning/30 disabled:opacity-50">
            {step === "registering" ? "Registering…" : "⚡ Register card (1-time)"}
          </button>
        )}
        {registered && <span className="text-[10px] text-arc-success">✓ Registered</span>}
      </div>

      <div className="bg-gradient-to-br from-arc-accent2 via-arc-quantum to-arc-accent rounded-2xl p-5 text-white mb-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="flex justify-between relative mb-4">
          <div className="text-[10px] opacity-90 font-bold tracking-wider">QUANTUMGUARD</div>
          <div className="text-[10px] font-bold">USDC · Arc</div>
        </div>
        <div className="font-mono text-lg tracking-widest relative mb-4 break-all">{formattedCard}</div>
        <div className="flex justify-between items-end text-xs relative">
          <div>
            <div className="opacity-60 text-[9px] tracking-wider">WALLET</div>
            <div className="font-mono text-[10px]">{address.slice(0, 6)}…{address.slice(-4)}</div>
          </div>
          <div className="text-right">
            <div className="opacity-60 text-[9px] tracking-wider">VAULT BALANCE</div>
            <div className="font-bold text-base">{fmt(vaultBalance)} USDC</div>
          </div>
        </div>
      </div>

      <div className="border border-arc-border rounded p-3 mb-4 text-center">
        <div className="text-[9px] text-gray-500 uppercase mb-1">Wallet balance (unspent)</div>
        <div className="text-white font-bold text-lg">{fmt(usdcBalance)} USDC</div>
      </div>

      <div className="flex gap-2 mb-3">
        <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
          className="flex-1 bg-arc-card border border-arc-border rounded px-3 py-2 text-sm font-mono" placeholder="1.00" />
        <button onClick={doDeposit} disabled={busy}
          className="px-4 py-2 rounded bg-arc-success/20 border border-arc-success/50 text-arc-success text-xs font-bold hover:bg-arc-success/30 transition disabled:opacity-50">
          {step === "approving" ? "Approving…" : step === "depositing" ? "Depositing…" : "＋ Deposit"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShowSend(true)} disabled={busy || vaultBalance === 0n}
          className="px-4 py-3 rounded bg-gradient-to-r from-arc-accent to-arc-quantum text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-40">
          {step === "sending" ? "Sending…" : "💸 Send USDC"}
        </button>
        <button onClick={doWithdraw} disabled={busy || vaultBalance === 0n}
          className="px-4 py-3 rounded border border-arc-border text-gray-300 text-sm hover:bg-arc-card transition disabled:opacity-40">
          {step === "withdrawing" ? "Withdrawing…" : "⬇️ Withdraw to wallet"}
        </button>
      </div>

      {lastTx ? (
        <div className="mt-3 text-[10px] text-gray-500">
          Last tx: <a href={explorer} target="_blank" rel="noreferrer" className="text-arc-accent hover:underline font-mono">{shortTx}</a>
          {txPending ? " (confirming…)" : ""}
        </div>
      ) : null}

      <div className="mt-3 text-[10px] text-gray-600 text-center">
        🔓 Fully decentralized · No custodian · Withdraw anytime
      </div>

      {showSend ? (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowSend(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">💸 Send USDC</h3>
              <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex gap-1 mb-4 border border-arc-border rounded p-1">
              <button onClick={() => setSendTab("address")}
                className={`flex-1 py-2 text-xs rounded ${sendTab === "address" ? "bg-arc-accent/20 text-arc-accent" : "text-gray-400"}`}>
                By Address
              </button>
              <button onClick={() => setSendTab("card")}
                className={`flex-1 py-2 text-xs rounded ${sendTab === "card" ? "bg-arc-accent/20 text-arc-accent" : "text-gray-400"}`}>
                By Card Number
              </button>
            </div>

            {sendTab === "address" ? (
              <input type="text" value={sendTo} onChange={(e) => setSendTo(e.target.value)}
                className="w-full bg-arc-card border border-arc-border rounded px-3 py-2 text-xs font-mono mb-3"
                placeholder="0xRecipient..." />
            ) : (
              <input type="text" value={sendCard} onChange={(e) => setSendCard(e.target.value)}
                className="w-full bg-arc-card border border-arc-border rounded px-3 py-2 text-sm font-mono mb-3"
                placeholder="1234 5678 9012 3456" />
            )}

            <div className="flex gap-2 mb-3">
              <input type="text" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                className="flex-1 bg-arc-card border border-arc-border rounded px-3 py-2 text-sm font-mono"
                placeholder="0.10" />
              <div className="text-xs text-gray-500 self-center">USDC</div>
            </div>

            <input type="text" value={sendMemo} onChange={(e) => setSendMemo(e.target.value)}
              className="w-full bg-arc-card border border-arc-border rounded px-3 py-2 text-xs mb-4"
              placeholder="Memo (optional)" />

            <button onClick={doSend} disabled={busy}
              className="w-full px-4 py-3 rounded bg-gradient-to-r from-arc-accent to-arc-quantum text-black font-bold text-sm hover:opacity-90 disabled:opacity-50">
              {step === "sending" ? "Sending…" : `Send ${sendAmount} USDC`}
            </button>

            {sendTab === "card" ? (
              <p className="text-[10px] text-gray-500 mt-3 text-center">
                ⚠️ Recipient must have registered their card first.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
