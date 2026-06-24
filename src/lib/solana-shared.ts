// SSR-safe: no @solana/web3.js imports. Only types and constants.

export type SolanaNetwork = "devnet" | "mainnet-beta";

export const USDC_MINTS: Record<SolanaNetwork, string> = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export const explorerTxUrl = (sig: string, network: SolanaNetwork = "devnet") => {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
};

export const explorerAddrUrl = (addr: string, network: SolanaNetwork = "devnet") => {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${addr}${cluster}`;
};
