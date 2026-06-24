// CLIENT-ONLY. Loaded lazily via `await import("@/lib/solana")` from client code only.
// Uses esm.sh at runtime to keep the SSR worker bundle clean of @solana/web3.js + spl-token,
// which don't ship a "workerd" export condition.

import { USDC_MINTS, type SolanaNetwork } from "./solana-shared";
export type { SolanaNetwork } from "./solana-shared";
export { USDC_MINTS, explorerTxUrl, explorerAddrUrl } from "./solana-shared";

const WEB3_URL = "https://esm.sh/@solana/web3.js@1.98.4?bundle&target=es2020";
const SPL_URL  = "https://esm.sh/@solana/spl-token@0.3.11?bundle&target=es2020&deps=@solana/web3.js@1.98.4";

type Web3Module = typeof import("@solana/web3.js");
type SplModule = typeof import("@solana/spl-token");

let web3Promise: Promise<Web3Module> | null = null;
let splPromise: Promise<SplModule> | null = null;

const loadWeb3 = () => (web3Promise ??= import(/* @vite-ignore */ WEB3_URL) as Promise<Web3Module>);
const loadSpl  = () => (splPromise  ??= import(/* @vite-ignore */ SPL_URL)  as Promise<SplModule>);

export const getConnection = async (network: SolanaNetwork = "devnet") => {
  const { Connection, clusterApiUrl } = await loadWeb3();
  return new Connection(clusterApiUrl(network), "confirmed");
};

export const getSolBalance = async (address: string, network: SolanaNetwork = "devnet") => {
  try {
    const { PublicKey, LAMPORTS_PER_SOL } = await loadWeb3();
    const conn = await getConnection(network);
    const lamports = await conn.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch { return 0; }
};

export const getUsdcBalance = async (address: string, network: SolanaNetwork = "devnet") => {
  try {
    const { PublicKey } = await loadWeb3();
    const { getAssociatedTokenAddress, getAccount, getMint } = await loadSpl();
    const conn = await getConnection(network);
    const mint = new PublicKey(USDC_MINTS[network]);
    const owner = new PublicKey(address);
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(conn, ata);
    const mintInfo = await getMint(conn, mint);
    return Number(account.amount) / Math.pow(10, mintInfo.decimals);
  } catch { return 0; }
};

export const isValidAddress = async (addr: string) => {
  try {
    const { PublicKey } = await loadWeb3();
    new PublicKey(addr);
    return true;
  } catch { return false; }
};

export const buildUsdcTransferTx = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  network: SolanaNetwork = "devnet",
) => {
  const { PublicKey, Transaction } = await loadWeb3();
  const {
    getAssociatedTokenAddress, createAssociatedTokenAccountInstruction,
    createTransferInstruction, getMint, TOKEN_PROGRAM_ID,
  } = await loadSpl();

  const conn = await getConnection(network);
  const from = new PublicKey(fromAddress);
  const to = new PublicKey(toAddress);
  const mint = new PublicKey(USDC_MINTS[network]);

  const fromAta = await getAssociatedTokenAddress(mint, from);
  const toAta = await getAssociatedTokenAddress(mint, to);

  const tx = new Transaction();
  const toAtaInfo = await conn.getAccountInfo(toAta);
  if (!toAtaInfo) tx.add(createAssociatedTokenAccountInstruction(from, toAta, to, mint));

  const mintInfo = await getMint(conn, mint);
  const amountBaseUnits = BigInt(Math.round(amount * Math.pow(10, mintInfo.decimals)));
  tx.add(createTransferInstruction(fromAta, toAta, from, amountBaseUnits, [], TOKEN_PROGRAM_ID));

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from;

  return { tx, connection: conn };
};

export const requestAirdrop = async (address: string, network: SolanaNetwork = "devnet") => {
  if (network !== "devnet") throw new Error("Airdrop only on devnet");
  const { PublicKey, LAMPORTS_PER_SOL } = await loadWeb3();
  const conn = await getConnection(network);
  const sig = await conn.requestAirdrop(new PublicKey(address), LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
};
