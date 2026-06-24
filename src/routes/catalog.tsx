import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CarCard } from "@/components/CarCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const carsQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const { data, error } = await supabase.from("cars").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Katalog Mobil — SolanaAuto" }, { name: "description", content: "Jelajahi seluruh koleksi mobil di SolanaAuto. Filter berdasarkan merk, tahun, harga, dan stok." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(carsQuery),
  component: CatalogPage,
  pendingComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat katalog…</div>,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-destructive p-8">{error.message}</div>,
});

function CatalogPage() {
  const { data: cars } = useSuspenseQuery(carsQuery);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [year, setYear] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const brands = useMemo(() => Array.from(new Set(cars.map((c) => c.brand))).sort(), [cars]);
  const years = useMemo(() => Array.from(new Set(cars.map((c) => c.year))).sort((a, b) => b - a), [cars]);

  const filtered = useMemo(() => {
    return cars.filter((c) => {
      if (q && !`${c.name} ${c.brand}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (brand !== "all" && c.brand !== brand) return false;
      if (year !== "all" && String(c.year) !== year) return false;
      if (priceRange !== "all") {
        const p = c.selling_price;
        if (priceRange === "lt300" && p >= 300_000_000) return false;
        if (priceRange === "300-500" && (p < 300_000_000 || p > 500_000_000)) return false;
        if (priceRange === "gt500" && p <= 500_000_000) return false;
      }
      if (stockFilter === "available" && c.stock === 0) return false;
      if (stockFilter === "low" && c.stock > 3) return false;
      if (stockFilter === "out" && c.stock !== 0) return false;
      return true;
    });
  }, [cars, q, brand, year, priceRange, stockFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-4xl font-bold">Katalog Mobil</h1>
            <p className="text-muted-foreground mt-2">{filtered.length} mobil tersedia</p>
          </div>
          <div className="grid md:grid-cols-5 gap-3 surface-glass rounded-xl p-4">
            <div className="md:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari mobil…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Merk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Merk</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger><SelectValue placeholder="Harga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Harga</SelectItem>
                <SelectItem value="lt300">Di bawah 300 Jt</SelectItem>
                <SelectItem value="300-500">300 – 500 Jt</SelectItem>
                <SelectItem value="gt500">Di atas 500 Jt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger><SelectValue placeholder="Stok" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Stok</SelectItem>
                <SelectItem value="available">Tersedia</SelectItem>
                <SelectItem value="low">Stok Menipis</SelectItem>
                <SelectItem value="out">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">Tidak ada mobil yang cocok dengan filter.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((c) => <CarCard key={c.id} car={c} />)}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
