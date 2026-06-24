// CLIENT-ONLY. Import this file via `await import("@/lib/solana")` from client code only.
// Top-level @solana imports are not resolvable in the Worker SSR build.
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { USDC_MINTS, type SolanaNetwork } from "./solana-shared";
export type { SolanaNetwork } from "./solana-shared";
export { USDC_MINTS, explorerTxUrl, explorerAddrUrl } from "./solana-shared";

export const getConnection = (network: SolanaNetwork = "devnet") => {
  return new Connection(clusterApiUrl(network), "confirmed");
};

export const getSolBalance = async (address: string, network: SolanaNetwork = "devnet") => {
  try {
    const conn = getConnection(network);
    const lamports = await conn.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
};

export const getUsdcBalance = async (address: string, network: SolanaNetwork = "devnet") => {
  try {
    const conn = getConnection(network);
    const mint = new PublicKey(USDC_MINTS[network]);
    const owner = new PublicKey(address);
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(conn, ata);
    const mintInfo = await getMint(conn, mint);
    return Number(account.amount) / Math.pow(10, mintInfo.decimals);
  } catch {
    return 0;
  }
};

export const isValidAddress = (addr: string) => {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
};

/**
 * Build a USDC transfer transaction. Returns serialized tx ready for wallet to sign.
 */
export const buildUsdcTransferTx = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  network: SolanaNetwork = "devnet",
) => {
  const conn = getConnection(network);
  const from = new PublicKey(fromAddress);
  const to = new PublicKey(toAddress);
  const mint = new PublicKey(USDC_MINTS[network]);

  const fromAta = await getAssociatedTokenAddress(mint, from);
  const toAta = await getAssociatedTokenAddress(mint, to);

  const tx = new Transaction();

  // create dest ATA if missing
  const toAtaInfo = await conn.getAccountInfo(toAta);
  if (!toAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(from, toAta, to, mint));
  }

  const mintInfo = await getMint(conn, mint);
  const amountBaseUnits = BigInt(Math.round(amount * Math.pow(10, mintInfo.decimals)));

  tx.add(createTransferInstruction(fromAta, toAta, from, amountBaseUnits, [], TOKEN_PROGRAM_ID));

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from;

  return { tx, connection: conn };
};

export const explorerTxUrl = (sig: string, network: SolanaNetwork = "devnet") => {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
};

export const explorerAddrUrl = (addr: string, network: SolanaNetwork = "devnet") => {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${addr}${cluster}`;
};

export const requestAirdrop = async (address: string, network: SolanaNetwork = "devnet") => {
  if (network !== "devnet") throw new Error("Airdrop only on devnet");
  const conn = getConnection(network);
  const sig = await conn.requestAirdrop(new PublicKey(address), LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
};

export { LAMPORTS_PER_SOL, SystemProgram };
