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
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto p-4">
      {/* Main AgentCard - Dribbble Inspired */}
      <div className="premium-card w-full p-8 flex flex-col relative group">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/0 via-purple-600/0 to-[#00D1FF]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-2 text-purple-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <span className="font-semibold tracking-wide text-sm uppercase">AgentCard</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${registered ? 'bg-[#00D1FF] shadow-[0_0_8px_#00D1FF]' : 'bg-orange-500 shadow-[0_0_8px_orange]'} animate-pulse`} />
            <span className="text-xs font-medium text-gray-300">{registered ? "Active" : "Unregistered"}</span>
            {!registered && (
               <button onClick={doRegister} disabled={busy} className="ml-2 text-[10px] text-orange-400 hover:text-white underline">
                 {step === "registering" ? "Registering…" : "Register Now"}
               </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-end relative z-10">
          <div className="flex flex-col">
            <span className="text-xs text-purple-300/60 uppercase tracking-widest mb-1">Vault Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light tracking-tight glow-text text-white">{fmt(vaultBalance)}</span>
              <span className="text-xl text-purple-300 font-medium">USDC</span>
            </div>
            <span className="text-[10px] mt-1 text-gray-400">Card: {formattedCard}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-xs text-purple-300/60 uppercase tracking-widest mb-1">Network</span>
             <span className="text-lg font-medium text-gray-200">Arc Testnet</span>
             <span className="text-xs text-gray-400 font-mono mt-1">{address.slice(0, 6)}…{address.slice(-4)}</span>
          </div>
        </div>

        {/* The Arc / Dribbble Dashed Line Graphic */}
        <div className="dash-arc mt-6 mb-2 relative z-10">
           {/* Node 1 */}
           <div className="absolute top-[40px] left-[10%] w-4 h-4 bg-[#231437] border-2 border-purple-400 rounded-full shadow-[0_0_15px_rgba(160,80,255,0.8)] z-20 flex justify-center items-center">
             <div className="w-1 h-1 bg-white rounded-full"></div>
           </div>
           
           {/* Node 2 */}
           <div className="absolute top-[40px] right-[10%] w-4 h-4 bg-[#231437] border-2 border-[#00D1FF] rounded-full shadow-[0_0_15px_rgba(0,209,255,0.8)] z-20 flex justify-center items-center">
             <div className="w-1 h-1 bg-white rounded-full"></div>
           </div>

           <div className="absolute top-[65px] left-[5%] text-xs text-purple-300/60">Wallet ({fmt(usdcBalance)} unspent)</div>
           <div className="absolute top-[65px] right-[5%] text-xs text-purple-300/60">Agent Vault</div>
        </div>
      </div>

      {/* Action Pills */}
      <div className="flex flex-col gap-3 w-full">
        {/* Deposit Control */}
        <div className="premium-pill flex justify-between w-full">
           <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-20 bg-transparent text-white border-b border-white/20 focus:outline-none text-center" />
           <button onClick={doDeposit} disabled={busy} className="text-purple-300 hover:text-white font-bold disabled:opacity-50 transition">
             {step === "approving" ? "Approving…" : step === "depositing" ? "Depositing…" : "＋ Deposit USDC"}
           </button>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button onClick={() => setShowSend(true)} disabled={busy || vaultBalance === 0n} className="premium-pill justify-center hover:bg-purple-500/10 disabled:opacity-40">
             <span className="text-gray-200">{step === "sending" ? "Sending…" : "💸 Send"}</span>
          </button>
          
          <button onClick={doWithdraw} disabled={busy || vaultBalance === 0n} className="premium-pill justify-center hover:bg-red-500/10 disabled:opacity-40">
             <span className="text-gray-200">{step === "withdrawing" ? "Withdrawing…" : "⬇️ Withdraw"}</span>
          </button>
        </div>
        
        {lastTx && (
          <div className="mt-2 text-center text-[10px] text-gray-500">
            Last tx: <a href={explorer} target="_blank" rel="noreferrer" className="text-[#00D1FF] hover:underline font-mono">{shortTx}</a>
            {txPending ? " (confirming…)" : ""}
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowSend(false)}>
          <div className="premium-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-white">💸 Send USDC</h3>
              <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex gap-1 mb-6 p-1 rounded-lg bg-black/40 border border-white/10">
              <button onClick={() => setSendTab("address")}
                className={`flex-1 py-2 text-xs rounded-md transition ${sendTab === "address" ? "bg-white/10 text-white" : "text-gray-400"}`}>
                By Address
              </button>
              <button onClick={() => setSendTab("card")}
                className={`flex-1 py-2 text-xs rounded-md transition ${sendTab === "card" ? "bg-white/10 text-white" : "text-gray-400"}`}>
                By Card Number
              </button>
            </div>

            {sendTab === "address" ? (
              <input type="text" value={sendTo} onChange={(e) => setSendTo(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono mb-4 focus:outline-none focus:border-purple-500/50"
                placeholder="0xRecipient..." />
            ) : (
              <input type="text" value={sendCard} onChange={(e) => setSendCard(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono mb-4 focus:outline-none focus:border-purple-500/50"
                placeholder="1234 5678 9012 3456" />
            )}

            <div className="flex gap-3 mb-4">
              <input type="text" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50"
                placeholder="0.10" />
              <div className="px-4 py-3 bg-white/5 rounded-lg text-sm text-purple-300 font-medium">USDC</div>
            </div>

            <input type="text" value={sendMemo} onChange={(e) => setSendMemo(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm mb-6 focus:outline-none focus:border-purple-500/50"
              placeholder="Memo (optional)" />

            <button onClick={doSend} disabled={busy}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-[#00D1FF] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition shadow-[0_0_20px_rgba(160,80,255,0.4)]">
              {step === "sending" ? "Sending…" : `Send ${sendAmount} USDC`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
