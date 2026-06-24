import { Car } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="container mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Car className="size-4" />
          </span>
          <span>SolanaAuto • Premium Web3 Showroom</span>
        </div>
        <p>Powered by Solana • Pembayaran instan dengan USDC</p>
      </div>
    </footer>
  );
}
