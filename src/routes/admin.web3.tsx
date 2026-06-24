import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUSDC, formatDate, shortAddr } from "@/lib/format";
import { Activity, Coins, Users, ArrowUpRight, ExternalLink } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { explorerAddrUrl, explorerTxUrl, type SolanaNetwork } from "@/lib/solana";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/web3")({
  head: () => ({ meta: [{ title: "Web3 Analytics — Admin" }] }),
  component: Web3Page,
});

function Web3Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["web3-analytics"],
    queryFn: async () => {
      const [txRes, walletsRes, settingsRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("wallet_users").select("*"),
        supabase.from("settings").select("solana_network").limit(1).maybeSingle(),
      ]);
      for (const r of [txRes, walletsRes, settingsRes]) if (r.error) throw r.error;
      return { tx: txRes.data!, wallets: walletsRes.data!, network: (settingsRes.data?.solana_network || "devnet") as SolanaNetwork };
    },
  });

  const monthly = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const buckets: Record<string, { month: string; volume: number; count: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[k] = { month: d.toLocaleDateString("en-US", { month: "short" }), volume: 0, count: 0 };
    }
    for (const t of data.tx) {
      if (t.payment_status !== "paid") continue;
      const d = new Date(t.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[k]) {
        buckets[k].volume += Number(t.total_usdc);
        buckets[k].count += 1;
      }
    }
    return Object.values(buckets);
  }, [data]);

  if (isLoading || !data) return <AdminShell title="Web3 Analytics"><div className="text-muted-foreground">Memuat…</div></AdminShell>;

  const paid = data.tx.filter((t) => t.payment_status === "paid");
  const totalUsdc = paid.reduce((a, t) => a + Number(t.total_usdc), 0);
  const activeWallets = new Set(data.tx.map((t) => t.wallet_address)).size;

  return (
    <AdminShell title="Web3 Analytics" description="Aktivitas on-chain dan metrik blockchain dealer">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Coins} label="Total USDC Diterima" value={formatUSDC(totalUsdc)} />
        <Kpi icon={Activity} label="Transaksi Blockchain" value={paid.length.toString()} />
        <Kpi icon={Users} label="Wallet Aktif" value={activeWallets.toString()} />
        <Kpi icon={ArrowUpRight} label="Jaringan" value={data.network} />
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-display font-semibold mb-4">Volume USDC Bulanan</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="usdcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="volume" stroke="var(--color-chart-2)" fill="url(#usdcGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Wallet Customer Terdaftar</h3>
          {data.wallets.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">Belum ada wallet</div> : (
            <div className="space-y-2">
              {data.wallets.slice(0, 10).map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <a href={explorerAddrUrl(w.wallet_address, data.network)} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1">
                    {shortAddr(w.wallet_address, 8)} <ExternalLink className="size-3" />
                  </a>
                  <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Riwayat Blockchain Terbaru</h3>
          {paid.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">Belum ada transaksi paid</div> : (
            <div className="space-y-3">
              {paid.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-mono text-xs">{shortAddr(t.wallet_address, 6)}</div>
                    {t.tx_signature && (
                      <a href={explorerTxUrl(t.tx_signature, data.network)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        {shortAddr(t.tx_signature, 8)} <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatUSDC(Number(t.total_usdc))}</div>
                    <Badge className="mt-1">paid</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="font-display font-bold mt-2 text-2xl">{value}</div>
    </Card>
  );
}
