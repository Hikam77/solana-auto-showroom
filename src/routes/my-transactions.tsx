import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import { ClientOnly } from "@/components/ClientOnly";
import { formatIDR, formatUSDC, formatDate, shortAddr } from "@/lib/format";
import { Wallet, FileText, Receipt } from "lucide-react";

export const Route = createFileRoute("/my-transactions")({
  head: () => ({ meta: [{ title: "Riwayat Transaksi — SolanaAuto" }, { name: "description", content: "Riwayat pembelian Anda di SolanaAuto." }] }),
  component: MyTxPage,
});

function MyTxPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Riwayat Transaksi</h1>
        <p className="text-muted-foreground mt-1">Daftar pembelian yang terkait dengan wallet Anda.</p>
        <div className="mt-6">
          <ClientOnly fallback={<div className="py-20 text-center text-muted-foreground">Memuat…</div>}>
            <Inner />
          </ClientOnly>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Inner() {
  const { address } = useWallet();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tx", address],
    queryFn: async () => {
      if (!address) return [];
      const { data: tx, error } = await supabase
        .from("transactions")
        .select("*, transaction_items(car_name, quantity)")
        .eq("wallet_address", address)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return tx;
    },
    enabled: !!address,
  });

  if (!address) {
    return (
      <Card className="p-12 text-center">
        <Wallet className="size-10 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold mt-4">Sambungkan wallet untuk melihat riwayat</h2>
        <p className="text-sm text-muted-foreground mt-2">Klik tombol Connect Wallet di pojok kanan atas.</p>
      </Card>
    );
  }

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Memuat transaksi…</div>;

  if (!data || data.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Receipt className="size-10 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold mt-4">Belum ada transaksi</h2>
        <p className="text-sm text-muted-foreground mt-2">Mulai cari mobil impian Anda.</p>
        <Button asChild className="mt-6"><Link to="/catalog">Lihat Katalog</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((t) => (
        <Card key={t.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{t.invoice_number}</span>
              <span>•</span>
              <span>{formatDate(t.created_at)}</span>
            </div>
            <div className="font-display font-semibold mt-1">
              {(t.transaction_items as Array<{ car_name: string | null }>).map((i) => i.car_name).join(", ")}
            </div>
            {t.tx_signature && <div className="text-xs text-muted-foreground font-mono mt-1">{shortAddr(t.tx_signature, 8)}</div>}
          </div>
          <div className="text-right">
            <div className="font-display font-bold">{formatIDR(t.total_idr)}</div>
            <div className="text-xs text-muted-foreground">{formatUSDC(Number(t.total_usdc))}</div>
          </div>
          <Badge variant={t.payment_status === "paid" ? "default" : t.payment_status === "failed" ? "destructive" : "secondary"}>
            {t.payment_status}
          </Badge>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to="/invoice/$invoiceNumber" params={{ invoiceNumber: t.invoice_number }}><FileText className="size-3.5" /> Invoice</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
