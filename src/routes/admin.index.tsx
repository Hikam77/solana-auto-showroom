import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR, formatUSDC } from "@/lib/format";
import { Car, Package, DollarSign, TrendingUp, Wallet, Activity, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { useMemo } from "react";

const dashboardQuery = queryOptions({
  queryKey: ["admin-dashboard"],
  queryFn: async () => {
    const [carsRes, txRes, walletsRes, itemsRes] = await Promise.all([
      supabase.from("cars").select("*"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("wallet_users").select("*"),
      supabase.from("transaction_items").select("car_id, car_name, quantity, unit_price"),
    ]);
    for (const r of [carsRes, txRes, walletsRes, itemsRes]) if (r.error) throw r.error;
    return { cars: carsRes.data!, tx: txRes.data!, wallets: walletsRes.data!, items: itemsRes.data! };
  },
});

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SolanaAuto" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: AdminDashboard,
  pendingComponent: () => <AdminShell title="Dashboard"><div className="text-muted-foreground">Memuat…</div></AdminShell>,
  errorComponent: ({ error }) => <AdminShell title="Dashboard"><div className="text-destructive">{error.message}</div></AdminShell>,
});

function AdminDashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { cars, tx, wallets, items } = data;

  const paid = tx.filter((t) => t.payment_status === "paid");
  const totalStock = cars.reduce((a, c) => a + c.stock, 0);
  const totalRevenue = paid.reduce((a, t) => a + t.total_idr, 0);
  const totalUsdc = paid.reduce((a, t) => a + Number(t.total_usdc), 0);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayRev = paid.filter((t) => new Date(t.created_at) >= today).reduce((a, t) => a + t.total_idr, 0);
  const monthRev = paid.filter((t) => new Date(t.created_at) >= monthStart).reduce((a, t) => a + t.total_idr, 0);

  const monthlyData = useMemo(() => {
    const buckets: Record<string, { month: string; sales: number; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { month: d.toLocaleDateString("id-ID", { month: "short" }), sales: 0, revenue: 0 };
    }
    for (const t of paid) {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[key]) {
        buckets[key].sales += 1;
        buckets[key].revenue += t.total_idr / 1_000_000;
      }
    }
    return Object.values(buckets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  const topCars = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    for (const i of items) {
      const k = i.car_name || i.car_id;
      if (!map[k]) map[k] = { name: i.car_name || "Unknown", qty: 0 };
      map[k].qty += i.quantity;
    }
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [items]);

  return (
    <AdminShell title="Dashboard" description="Ringkasan performa showroom hari ini">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Car} label="Total Mobil" value={cars.length.toString()} />
        <Kpi icon={Package} label="Total Stok" value={totalStock.toString()} />
        <Kpi icon={DollarSign} label="Total Penjualan" value={formatIDR(totalRevenue)} small />
        <Kpi icon={TrendingUp} label="Pendapatan Hari Ini" value={formatIDR(todayRev)} small />
        <Kpi icon={TrendingUp} label="Pendapatan Bulan Ini" value={formatIDR(monthRev)} small />
        <Kpi icon={Wallet} label="Wallet Terdaftar" value={wallets.length.toString()} />
        <Kpi icon={Activity} label="Transaksi Blockchain" value={paid.length.toString()} />
        <Kpi icon={DollarSign} label="Total USDC" value={formatUSDC(totalUsdc)} small />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Penjualan Bulanan</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="sales" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Pendapatan Bulanan (juta IDR)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ fill: "var(--color-chart-2)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Mobil Terlaris</h3>
          {topCars.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Belum ada penjualan</div>
          ) : (
            <div className="space-y-3">
              {topCars.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary font-bold text-sm">{i + 1}</span>
                  <div className="flex-1">{c.name}</div>
                  <Badge>{c.qty} unit</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Aktivitas Blockchain Terbaru</h3>
            <Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/admin/transactions">Semua <ArrowRight className="size-3" /></Link></Button>
          </div>
          {tx.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">Belum ada transaksi</div> : (
            <div className="space-y-3">
              {tx.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{t.invoice_number}</div>
                    <div className="font-mono text-xs">{t.wallet_address.slice(0, 12)}…</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatUSDC(Number(t.total_usdc))}</div>
                    <Badge variant={t.payment_status === "paid" ? "default" : t.payment_status === "failed" ? "destructive" : "secondary"} className="mt-1">{t.payment_status}</Badge>
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

function Kpi({ icon: Icon, label, value, small }: { icon: typeof Car; label: string; value: string; small?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className={`font-display font-bold mt-2 ${small ? "text-xl" : "text-3xl"}`}>{value}</div>
    </Card>
  );
}

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "secondary" | "destructive"; className?: string }) {
  const styles = {
    default: "bg-success/15 text-success",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/15 text-destructive",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[variant]} ${className}`}>{children}</span>;
}
