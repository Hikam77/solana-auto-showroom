import { createFileRoute, Link, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { ClientOnly } from "@/components/ClientOnly";
import type { SolanaNetwork } from "@/lib/solana-shared";
import { formatIDR, formatSOL, formatUSDC, idrToUsdc, shortAddr, todayInvoiceNumber } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Wallet, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";

const checkoutQuery = (id: string) =>
  queryOptions({
    queryKey: ["checkout", id],
    queryFn: async () => {
      const [carRes, settingsRes] = await Promise.all([
        supabase.from("cars").select("*").eq("id", id).maybeSingle(),
        supabase.from("settings").select("*").limit(1).maybeSingle(),
      ]);
      if (carRes.error) throw carRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (!carRes.data) throw notFound();
      return { car: carRes.data, settings: settingsRes.data };
    },
  });

export const Route = createFileRoute("/checkout/$id")({
  head: () => ({ meta: [{ title: "Checkout — SolanaAuto" }, { name: "description", content: "Selesaikan pembelian mobil Anda dengan pembayaran USDC di Solana." }] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(checkoutQuery(params.id)),
  component: CheckoutPage,
  pendingComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat checkout…</div>,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-destructive p-8">{error.message}</div>,
});

function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Lanjut belanja
        </Link>
        <ClientOnly fallback={<div className="py-20 text-center text-muted-foreground">Mempersiapkan…</div>}>
          <CheckoutInner />
        </ClientOnly>
      </section>
      <Footer />
    </div>
  );
}

function CheckoutInner() {
  const { id } = useParams({ from: "/checkout/$id" });
  const { data } = useSuspenseQuery(checkoutQuery(id));
  const { car, settings } = data;
  const wallet = useWallet();
  const navigate = useNavigate();

  const network = (settings?.solana_network || "devnet") as SolanaNetwork;
  const rate = Number(settings?.idr_per_usdc || 16000);
  const usdcAmount = idrToUsdc(car.selling_price, rate);
  const dealerWallet = settings?.dealer_wallet || "";

  const [sol, setSol] = useState(0);
  const [usdc, setUsdc] = useState(0);
  const [loadingBal, setLoadingBal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [airdropping, setAirdropping] = useState(false);

  const refreshBalances = async () => {
    if (!wallet.address) return;
    setLoadingBal(true);
    try {
      const [s, u] = await Promise.all([getSolBalance(wallet.address, network), getUsdcBalance(wallet.address, network)]);
      setSol(s);
      setUsdc(u);
    } finally { setLoadingBal(false); }
  };

  useEffect(() => { refreshBalances(); /* eslint-disable-next-line */ }, [wallet.address, network]);

  const handleAirdrop = async () => {
    if (!wallet.address) return;
    setAirdropping(true);
    try {
      await requestAirdrop(wallet.address, network);
      toast.success("Airdrop 1 SOL berhasil (devnet)");
      await refreshBalances();
    } catch (e) {
      toast.error("Airdrop gagal", { description: (e as Error).message });
    } finally { setAirdropping(false); }
  };

  const handlePay = async () => {
    if (!wallet.address) return toast.error("Sambungkan wallet dulu");
    if (!dealerWallet) return toast.error("Dealer wallet belum diset. Hubungi admin.");
    if (car.stock <= 0) return toast.error("Stok habis");
    if (usdc < usdcAmount) return toast.error("Saldo USDC tidak cukup", { description: `Butuh ${formatUSDC(usdcAmount)}` });

    setPaying(true);
    const invoice_number = todayInvoiceNumber();
    try {
      // 1. Build tx
      const { tx, connection } = await buildUsdcTransferTx(wallet.address, dealerWallet, usdcAmount, network);
      // 2. Register wallet
      await supabase.from("wallet_users").upsert({ wallet_address: wallet.address }, { onConflict: "wallet_address" });
      // 3. Create pending transaction
      const { data: txRow, error: txErr } = await supabase
        .from("transactions")
        .insert({
          invoice_number,
          wallet_address: wallet.address,
          total_idr: car.selling_price,
          total_usdc: usdcAmount,
          payment_status: "pending",
        })
        .select()
        .single();
      if (txErr) throw txErr;
      await supabase.from("transaction_items").insert({
        transaction_id: txRow.id,
        car_id: car.id,
        quantity: 1,
        unit_price: car.selling_price,
        car_name: car.name,
      });
      toast.message("Konfirmasi pembayaran di wallet Anda…");
      // 4. Sign + send
      const signature = await wallet.signAndSend(tx, connection);
      // 5. Update tx + decrement stock
      await supabase.from("transactions").update({ tx_signature: signature, payment_status: "paid" }).eq("id", txRow.id);
      await supabase.from("cars").update({ stock: Math.max(0, car.stock - 1) }).eq("id", car.id);
      toast.success("Pembayaran berhasil! Invoice diterbitkan.");
      navigate({ to: "/invoice/$invoiceNumber", params: { invoiceNumber: invoice_number } });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error("Pembayaran gagal", { description: msg });
      await supabase.from("transactions").update({ payment_status: "failed" }).eq("invoice_number", invoice_number);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold">Checkout Pesanan</h2>
          <p className="text-sm text-muted-foreground mt-1">Konfirmasi pesanan dan bayar dengan USDC di Solana ({network}).</p>
          <div className="mt-6 flex gap-4 p-4 rounded-lg bg-secondary/40">
            <div className="size-20 rounded-md bg-gradient-to-br from-primary/30 to-accent/20 grid place-items-center font-display font-bold">{car.brand[0]}</div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand}</div>
              <div className="font-display font-semibold">{car.name}</div>
              <div className="text-sm text-muted-foreground mt-1">Tahun {car.year} • {car.transmission || "-"}</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold">{formatIDR(car.selling_price)}</div>
              <div className="text-xs text-muted-foreground mt-1">{formatUSDC(usdcAmount)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Status Wallet</h3>
          {!wallet.address ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40">
              <div className="flex items-center gap-3">
                <Wallet className="size-5 text-primary" />
                <div className="text-sm">Wallet belum terhubung. Klik <strong>Connect Wallet</strong> di pojok kanan atas.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                <div className="text-sm">Wallet</div>
                <div className="font-mono text-sm">{shortAddr(wallet.address, 6)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/40">
                  <div className="text-xs text-muted-foreground">Saldo SOL</div>
                  <div className="font-display font-bold mt-1">{loadingBal ? "…" : formatSOL(sol)}</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/40">
                  <div className="text-xs text-muted-foreground">Saldo USDC</div>
                  <div className="font-display font-bold mt-1">{loadingBal ? "…" : formatUSDC(usdc)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshBalances} disabled={loadingBal}>Refresh</Button>
                {network === "devnet" && (
                  <Button variant="outline" size="sm" onClick={handleAirdrop} disabled={airdropping}>
                    {airdropping && <Loader2 className="size-3 animate-spin" />} Airdrop 1 SOL (devnet)
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="p-6 sticky top-20">
          <h3 className="font-display font-semibold">Ringkasan Pembayaran</h3>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Harga Mobil" value={formatIDR(car.selling_price)} />
            <Row label="Kurs" value={`1 USDC ≈ ${formatIDR(rate)}`} />
            <Row label="Jaringan" value={<Badge variant="outline">{network}</Badge>} />
            <Row label="Dealer Wallet" value={dealerWallet ? shortAddr(dealerWallet, 6) : <span className="text-destructive">Belum diset</span>} />
            <div className="border-t border-border my-3" />
            <Row label="Total IDR" value={<strong>{formatIDR(car.selling_price)}</strong>} />
            <Row label="Total USDC" value={<strong className="text-gradient-primary">{formatUSDC(usdcAmount)}</strong>} />
          </div>
          {!dealerWallet && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>Dealer belum mengatur wallet penerima. Admin perlu mengisinya di Settings sebelum checkout dapat dijalankan.</span>
            </div>
          )}
          <Button
            size="lg"
            className="w-full mt-6 gap-2"
            disabled={!wallet.address || paying || !dealerWallet || car.stock === 0}
            onClick={handlePay}
          >
            {paying ? <><Loader2 className="size-4 animate-spin" /> Memproses…</> : <><Sparkles className="size-4" /> Bayar {formatUSDC(usdcAmount)}</>}
          </Button>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" /> Settlement instan on-chain
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
