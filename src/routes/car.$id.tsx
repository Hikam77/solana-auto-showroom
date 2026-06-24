import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { ArrowLeft, Calendar, Gauge, Fuel, Palette, Package, ShieldCheck } from "lucide-react";

const carQuery = (id: string) =>
  queryOptions({
    queryKey: ["car", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

export const Route = createFileRoute("/car/$id")({
  head: ({ params }) => ({ meta: [{ title: `Detail Mobil — SolanaAuto` }, { name: "description", content: `Detail mobil ${params.id} di SolanaAuto.` }] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(carQuery(params.id)),
  component: CarDetailPage,
  pendingComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-destructive p-8">{error.message}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-8">
      <div>
        <h2 className="font-display text-2xl">Mobil tidak ditemukan</h2>
        <Link to="/catalog" className="text-primary hover:underline mt-3 inline-block">← Kembali ke katalog</Link>
      </div>
    </div>
  ),
});

function CarDetailPage() {
  const { id } = useParams({ from: "/car/$id" });
  const { data: car } = useSuspenseQuery(carQuery(id));
  const outOfStock = car.stock === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="container mx-auto px-4 py-8">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Kembali ke katalog
        </Link>
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <Card className="aspect-[16/10] overflow-hidden p-0 bg-gradient-to-br from-primary/20 to-accent/10 grid place-items-center">
              {car.image_url ? (
                <img src={car.image_url} alt={car.name} className="size-full object-cover" />
              ) : (
                <div className="text-center p-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{car.brand}</div>
                  <div className="text-4xl md:text-6xl font-display font-bold mt-2">{car.name}</div>
                </div>
              )}
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-xl font-bold mb-3">Deskripsi</h2>
              <p className="text-muted-foreground leading-relaxed">{car.description || "Tidak ada deskripsi."}</p>
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-xl font-bold mb-4">Spesifikasi</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Spec icon={Calendar} label="Tahun" value={String(car.year)} />
                <Spec icon={Palette} label="Warna" value={car.color || "-"} />
                <Spec icon={Gauge} label="Transmisi" value={car.transmission || "-"} />
                <Spec icon={Fuel} label="Bahan Bakar" value={car.fuel_type || "-"} />
                <Spec icon={Package} label="Stok" value={`${car.stock} unit`} />
                <Spec icon={ShieldCheck} label="Status" value={car.status} />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 sticky top-20">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{car.brand}</div>
              <h1 className="font-display text-3xl font-bold mt-1">{car.name}</h1>
              <Badge variant={outOfStock ? "destructive" : car.stock <= 3 ? "secondary" : "default"} className="mt-3">
                {outOfStock ? "Habis" : car.stock <= 3 ? "Stok Menipis" : "Tersedia"}
              </Badge>
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Harga</div>
                <div className="text-3xl font-display font-bold text-gradient-primary mt-1">{formatIDR(car.selling_price)}</div>
                <div className="text-xs text-muted-foreground mt-1">Bayar dengan USDC di Solana</div>
              </div>
              <Button asChild size="lg" className="w-full mt-6" disabled={outOfStock}>
                <Link to="/checkout/$id" params={{ id: car.id }} disabled={outOfStock}>
                  {outOfStock ? "Stok Habis" : "Checkout dengan Wallet"}
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Anda akan diminta menyambungkan wallet Solana (Phantom, Solflare, atau Backpack).
              </p>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
