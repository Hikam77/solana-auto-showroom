import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatUSDC, formatDate, shortAddr } from "@/lib/format";
import { downloadInvoicePDF } from "@/lib/pdf";
import { explorerTxUrl, type SolanaNetwork } from "@/lib/solana-shared";
import { Download, Printer, ExternalLink, ArrowLeft, CheckCircle2, Clock, XCircle, Car } from "lucide-react";

const invoiceQuery = (invoiceNumber: string) =>
  queryOptions({
    queryKey: ["invoice", invoiceNumber],
    queryFn: async () => {
      const { data: tx, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("invoice_number", invoiceNumber)
        .maybeSingle();
      if (error) throw error;
      if (!tx) throw notFound();
      const [itemsRes, settingsRes] = await Promise.all([
        supabase.from("transaction_items").select("*").eq("transaction_id", tx.id),
        supabase.from("settings").select("*").limit(1).maybeSingle(),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (settingsRes.error) throw settingsRes.error;
      return { tx, items: itemsRes.data, settings: settingsRes.data };
    },
  });

export const Route = createFileRoute("/invoice/$invoiceNumber")({
  head: ({ params }) => ({ meta: [{ title: `Invoice ${params.invoiceNumber} — SolanaAuto` }, { name: "description", content: "Invoice transaksi mobil di SolanaAuto." }] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(invoiceQuery(params.invoiceNumber)),
  component: InvoicePage,
  pendingComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat invoice…</div>,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-destructive p-8">{error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center p-8">Invoice tidak ditemukan</div>,
});

const statusBadge = (s: string) => {
  if (s === "paid") return { label: "Paid", icon: CheckCircle2, variant: "default" as const, className: "bg-success text-success-foreground" };
  if (s === "failed") return { label: "Failed", icon: XCircle, variant: "destructive" as const, className: "" };
  return { label: "Pending", icon: Clock, variant: "secondary" as const, className: "" };
};

function InvoicePage() {
  const { invoiceNumber } = useParams({ from: "/invoice/$invoiceNumber" });
  const { data } = useSuspenseQuery(invoiceQuery(invoiceNumber));
  const { tx, items, settings } = data;
  const network = (settings?.solana_network || "devnet") as SolanaNetwork;
  const st = statusBadge(tx.payment_status);
  const Icon = st.icon;

  const handleDownload = () => {
    downloadInvoicePDF({
      invoice_number: tx.invoice_number,
      created_at: tx.created_at,
      payment_status: tx.payment_status,
      wallet_address: tx.wallet_address,
      total_idr: tx.total_idr,
      total_usdc: Number(tx.total_usdc),
      tx_signature: tx.tx_signature,
      items: items.map((i) => ({ car_name: i.car_name, quantity: i.quantity, unit_price: i.unit_price })),
      dealer: {
        dealer_name: settings?.dealer_name || "SolanaAuto",
        dealer_address: settings?.dealer_address,
        dealer_phone: settings?.dealer_phone,
        dealer_email: settings?.dealer_email,
        dealer_website: settings?.dealer_website,
        dealer_wallet: settings?.dealer_wallet,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to="/my-transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Riwayat
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> Print</Button>
            <Button size="sm" onClick={handleDownload} className="gap-2"><Download className="size-4" /> PDF</Button>
          </div>
        </div>

        <Card className="p-8 md:p-10 print:shadow-none">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Car className="size-5" /></span>
                <div>
                  <div className="font-display font-bold text-xl">{settings?.dealer_name}</div>
                  <div className="text-xs text-muted-foreground">{settings?.dealer_address}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                <div>{settings?.dealer_phone} • {settings?.dealer_email}</div>
                <div>{settings?.dealer_website}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Invoice</div>
              <div className="font-display text-2xl font-bold">{tx.invoice_number}</div>
              <div className="text-xs text-muted-foreground mt-1">{formatDate(tx.created_at)}</div>
              <Badge className={`mt-2 ${st.className}`} variant={st.variant}>
                <Icon className="size-3" /> {st.label}
              </Badge>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 py-6 border-b border-border">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Customer Wallet</div>
              <div className="font-mono text-sm mt-1 break-all">{tx.wallet_address}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Dealer Wallet</div>
              <div className="font-mono text-sm mt-1 break-all">{settings?.dealer_wallet || "-"}</div>
            </div>
          </div>

          <div className="py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Mobil</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-border/50">
                    <td className="py-3">{i.car_name}</td>
                    <td className="py-3 text-center">{i.quantity}</td>
                    <td className="py-3 text-right">{formatIDR(i.unit_price)}</td>
                    <td className="py-3 text-right">{formatIDR(i.unit_price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total IDR</span><span className="font-semibold">{formatIDR(tx.total_idr)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total USDC</span><span className="font-display font-bold text-gradient-primary">{formatUSDC(Number(tx.total_usdc))}</span></div>
              {tx.tx_signature && (
                <div className="pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">Transaction Hash</div>
                  <a href={explorerTxUrl(tx.tx_signature, network)} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1 break-all">
                    {shortAddr(tx.tx_signature, 12)} <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
