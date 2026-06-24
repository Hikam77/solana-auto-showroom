import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, formatUSDC, formatDate, shortAddr } from "@/lib/format";
import { Search, FileText, ExternalLink } from "lucide-react";
import { explorerTxUrl, type SolanaNetwork } from "@/lib/solana";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [{ title: "Transaksi — Admin" }] }),
  component: AdminTxPage,
});

function AdminTxPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: async () => {
      const [txRes, settingsRes] = await Promise.all([
        supabase.from("transactions").select("*, transaction_items(car_name, quantity)").order("created_at", { ascending: false }),
        supabase.from("settings").select("solana_network").limit(1).maybeSingle(),
      ]);
      if (txRes.error) throw txRes.error;
      if (settingsRes.error) throw settingsRes.error;
      return { tx: txRes.data, network: (settingsRes.data?.solana_network || "devnet") as SolanaNetwork };
    },
  });

  const filtered = (data?.tx ?? []).filter((t) => {
    if (status !== "all" && t.payment_status !== status) return false;
    if (q && !`${t.invoice_number} ${t.wallet_address}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminShell title="Transaksi" description="Semua transaksi blockchain customer">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari invoice atau wallet…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="py-20 text-center text-muted-foreground">Memuat…</div> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Wallet</th>
                  <th className="p-3">Mobil</th>
                  <th className="p-3">Total IDR</th>
                  <th className="p-3">Total USDC</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tx Hash</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{t.invoice_number}</td>
                    <td className="p-3 font-mono text-xs">{shortAddr(t.wallet_address, 6)}</td>
                    <td className="p-3">{(t.transaction_items as Array<{ car_name: string | null; quantity: number }>).map((i) => `${i.car_name} ×${i.quantity}`).join(", ")}</td>
                    <td className="p-3">{formatIDR(t.total_idr)}</td>
                    <td className="p-3">{formatUSDC(Number(t.total_usdc))}</td>
                    <td className="p-3">
                      <Badge variant={t.payment_status === "paid" ? "default" : t.payment_status === "failed" ? "destructive" : "secondary"}>{t.payment_status}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {t.tx_signature ? (
                        <a href={explorerTxUrl(t.tx_signature, data!.network)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {shortAddr(t.tx_signature, 6)} <ExternalLink className="size-3" />
                        </a>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(t.created_at)}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/invoice/$invoiceNumber" params={{ invoiceNumber: t.invoice_number }}><FileText className="size-3.5" /></Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Tidak ada transaksi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
