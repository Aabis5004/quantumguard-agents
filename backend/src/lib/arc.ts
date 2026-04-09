// Arc Testnet RPC helpers using viem

import { createPublicClient, http, defineChain, type Address } from "viem";
import "dotenv/config";

export const arcTestnet = defineChain({
  id: Number(process.env.ARC_CHAIN_ID || 5042002),
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
});

export const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

/**
 * Fetch the basic on-chain footprint of a contract.
 * Returns bytecode size, balance, tx count, and whether the address has exposed
 * its public key (i.e. has signed at least one transaction).
 */
export async function fetchOnchainData(address: string) {
  const addr = address as Address;

  const [bytecode, balance, txCount] = await Promise.all([
    arcClient.getCode({ address: addr }),
    arcClient.getBalance({ address: addr }),
    arcClient.getTransactionCount({ address: addr }),
  ]);

  const hasCode = !!bytecode && bytecode !== "0x";
  const bytecodeSize = hasCode ? (bytecode!.length - 2) / 2 : 0;

  // Any address that has ever signed a tx has exposed its public key.
  // For contracts, the deployer's public key is exposed at deployment.
  const exposedPublicKey = txCount > 0 || hasCode;

  return {
    address,
    bytecodeSize,
    hasCode,
    balance: balance.toString(),
    txCount,
    age: "unknown",
    exposedPublicKey,
  };
}
