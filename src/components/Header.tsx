import { Link, useRouterState } from "@tanstack/react-router";
import { Car, Wallet, LogOut, Copy, ChevronDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet, type WalletProviderName } from "@/lib/wallet";
import { ClientOnly } from "./ClientOnly";
import { shortAddr } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Katalog" },
  { to: "/my-transactions", label: "Riwayat" },
];

function WalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();

  const tryConnect = (name: WalletProviderName) => connect(name);

  if (!address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" disabled={connecting} className="gap-2">
            <Wallet className="size-4" />
            {connecting ? "Connecting…" : "Connect Wallet"}
            <ChevronDown className="size-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Pilih Wallet Solana</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => tryConnect("phantom")}>👻 Phantom</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => tryConnect("solflare")}>🔥 Solflare</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => tryConnect("backpack")}>🎒 Backpack</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse" />
          <Wallet className="size-4" />
          {shortAddr(address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-mono text-xs break-all">{address}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address disalin");
          }}
        >
          <Copy className="size-4" /> Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => disconnect()}>
          <LogOut className="size-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-5" />
          </span>
          <span>Solana<span className="text-primary">Auto</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-colors",
                pathname === n.to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/admin"
            className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 inline-flex items-center gap-1"
          >
            <Activity className="size-4" /> Admin
          </Link>
        </nav>
        <ClientOnly fallback={<Button disabled variant="default" className="gap-2"><Wallet className="size-4" />Wallet</Button>}>
          <WalletButton />
        </ClientOnly>
      </div>
    </header>
  );
}
