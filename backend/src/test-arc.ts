import { fetchOnchainData } from "./lib/arc.js";

const myContract = process.env.QUANTUMGUARD_CONTRACT || "0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A";

console.log(`Fetching on-chain data for ${myContract}...\n`);

const data = await fetchOnchainData(myContract);

console.log("Result:");
console.log(JSON.stringify(data, null, 2));
