import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Transaction } from "@solana/web3.js";
import { toast } from "sonner";

export type WalletProviderName = "phantom" | "solflare" | "backpack";

interface InjectedWallet {
  publicKey: { toString: () => string } | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeAllListeners?: (event: string) => void;
}

interface WindowWithWallets extends Window {
  solana?: InjectedWallet & { isPhantom?: boolean };
  solflare?: InjectedWallet & { isSolflare?: boolean };
  backpack?: InjectedWallet;
}

const getProvider = (name: WalletProviderName): InjectedWallet | null => {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithWallets;
  if (name === "phantom" && w.solana?.isPhantom) return w.solana;
  if (name === "solflare" && w.solflare?.isSolflare) return w.solflare;
  if (name === "backpack" && w.backpack) return w.backpack;
  return null;
};

interface WalletState {
  address: string | null;
  provider: WalletProviderName | null;
  connecting: boolean;
  connect: (name: WalletProviderName) => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSend: (tx: Transaction, connection: { sendRawTransaction: (b: Uint8Array) => Promise<string>; confirmTransaction: (sig: string) => Promise<unknown> }) => Promise<string>;
}

const Ctx = createContext<WalletState | null>(null);

const STORAGE_KEY = "solana-auto:wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<WalletProviderName | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Auto reconnect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const name = saved as WalletProviderName;
    const p = getProvider(name);
    if (!p) return;
    p.connect({ onlyIfTrusted: true })
      .then((res) => {
        setAddress(res.publicKey.toString());
        setProvider(name);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  const connect = useCallback(async (name: WalletProviderName) => {
    setConnecting(true);
    try {
      const p = getProvider(name);
      if (!p) {
        const urls: Record<WalletProviderName, string> = {
          phantom: "https://phantom.app/",
          solflare: "https://solflare.com/",
          backpack: "https://backpack.app/",
        };
        toast.error(`${name[0].toUpperCase()}${name.slice(1)} wallet not detected`, {
          description: `Install from ${urls[name]}`,
        });
        return;
      }
      const res = await p.connect();
      setAddress(res.publicKey.toString());
      setProvider(name);
      window.localStorage.setItem(STORAGE_KEY, name);
      toast.success("Wallet connected");
    } catch (err) {
      toast.error("Failed to connect wallet", { description: (err as Error).message });
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (provider) {
      const p = getProvider(provider);
      try { await p?.disconnect(); } catch { /* ignore */ }
    }
    setAddress(null);
    setProvider(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    toast.success("Wallet disconnected");
  }, [provider]);

  const signAndSend = useCallback(async (tx: Transaction, connection: { sendRawTransaction: (b: Uint8Array) => Promise<string>; confirmTransaction: (sig: string) => Promise<unknown> }) => {
    if (!provider) throw new Error("Wallet not connected");
    const p = getProvider(provider);
    if (!p) throw new Error("Wallet provider unavailable");
    if (p.signAndSendTransaction) {
      const { signature } = await p.signAndSendTransaction(tx);
      await connection.confirmTransaction(signature);
      return signature;
    }
    const signed = await p.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);
    return sig;
  }, [provider]);

  const value = useMemo<WalletState>(() => ({ address, provider, connecting, connect, disconnect, signAndSend }), [address, provider, connecting, connect, disconnect, signAndSend]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWallet = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside WalletProvider");
  return v;
};
