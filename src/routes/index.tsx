import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Globe, Sparkles } from "lucide-react";
import { formatIDR } from "@/lib/format";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const [carsRes, txRes] = await Promise.all([
      supabase.from("cars").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("transactions").select("id, total_usdc, payment_status"),
    ]);
    if (carsRes.error) throw carsRes.error;
    if (txRes.error) throw txRes.error;
    return {
      cars: carsRes.data,
      stats: {
        totalCars: carsRes.data.length,
        totalStock: carsRes.data.reduce((a, c) => a + c.stock, 0),
        txCount: txRes.data.length,
        totalUsdc: txRes.data.filter((t) => t.payment_status === "paid").reduce((a, t) => a + Number(t.total_usdc), 0),
      },
    };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolanaAuto — Showroom Mobil Web3" },
      { name: "description", content: "Beli mobil impian Anda dengan pembayaran USDC di blockchain Solana. Cepat, transparan, dan aman." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: HomePage,
  pendingComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat showroom…</div>,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-destructive p-8">{error.message}</div>,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const featured = data.cars.slice(0, 3);
  const latest = data.cars;
  const cheapest = [...data.cars].sort((a, b) => a.selling_price - b.selling_price)[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-60" />
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="container mx-auto px-4 pt-20 pb-24 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs text-muted-foreground mb-6">
              <Sparkles className="size-3 text-primary" /> Web3 Showroom × USDC Payments on Solana
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight">
              Drive into the<br />
              <span className="text-gradient-primary">decentralized</span> future.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Showroom mobil pertama di Indonesia dengan pembayaran on-chain. Transaksi instan via Solana — settlement dalam hitungan detik.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/catalog">Lihat Katalog <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/admin">Admin Dashboard</Link>
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <Stat label="Unit Tersedia" value={data.stats.totalStock.toString()} />
              <Stat label="Mobil Aktif" value={data.stats.totalCars.toString()} />
              <Stat label="Transaksi On-chain" value={data.stats.txCount.toString()} />
              <Stat label="Volume USDC" value={data.stats.totalUsdc.toFixed(0)} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Web3 */}
      <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-4">
        <Feature icon={Zap} title="Pembayaran Instan" desc="Settlement on-chain hanya butuh beberapa detik di Solana." />
        <Feature icon={Shield} title="Transparan & Aman" desc="Setiap transaksi tercatat permanen di blockchain dan dapat diverifikasi." />
        <Feature icon={Globe} title="Tanpa Batas" desc="Bayar dari mana saja menggunakan USDC, tanpa transfer bank antar negara." />
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 py-12">
        <SectionHeader title="Mobil Unggulan" subtitle="Pilihan terbaik dari koleksi kami" link="/catalog" />
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          {featured.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      </section>

      {/* Promo */}
      {cheapest && (
        <section className="container mx-auto px-4 py-12">
          <Card className="relative overflow-hidden p-8 md:p-12 bg-gradient-to-br from-primary/20 via-accent/10 to-background border-primary/30">
            <div className="relative z-10 max-w-2xl">
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">Promo Spesial Web3</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-2">
                Dapatkan {cheapest.name} mulai {formatIDR(cheapest.selling_price)}
              </h2>
              <p className="mt-4 text-muted-foreground">Bayar dengan USDC dan nikmati pengalaman membeli mobil paling modern di Indonesia.</p>
              <Button asChild className="mt-6 gap-2">
                <Link to="/car/$id" params={{ id: cheapest.id }}>Cek Promo <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-primary/30 blur-3xl" />
          </Card>
        </section>
      )}

      {/* Latest */}
      <section className="container mx-auto px-4 py-12">
        <SectionHeader title="Mobil Terbaru" subtitle="Inventory terkini di showroom" link="/catalog" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          {latest.slice(0, 4).map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Zap; title: string; desc: string }) {
  return (
    <Card className="p-6">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="font-display font-semibold mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
    </Card>
  );
}

function SectionHeader({ title, subtitle, link }: { title: string; subtitle: string; link: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-3xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Link to={link} className="text-sm text-primary hover:underline inline-flex items-center gap-1">Lihat semua <ArrowRight className="size-4" /></Link>
    </div>
  );
}
