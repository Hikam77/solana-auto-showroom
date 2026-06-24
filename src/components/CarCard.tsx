import { Link } from "@tanstack/react-router";
import { Fuel, Gauge, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { Card } from "@/components/ui/card";

interface Car {
  id: string;
  name: string;
  brand: string;
  year: number;
  selling_price: number;
  stock: number;
  status: string;
  transmission?: string | null;
  fuel_type?: string | null;
  image_url?: string | null;
}

const stockBadge = (stock: number) => {
  if (stock === 0) return { label: "Habis", variant: "destructive" as const };
  if (stock <= 3) return { label: "Stok Menipis", variant: "secondary" as const };
  return { label: "Tersedia", variant: "default" as const };
};

const brandGradient = (brand: string) => {
  const colors: Record<string, string> = {
    Toyota: "from-red-500/30 to-orange-500/10",
    Honda: "from-blue-500/30 to-cyan-500/10",
    Mitsubishi: "from-rose-500/30 to-pink-500/10",
    Hyundai: "from-indigo-500/30 to-blue-500/10",
    Wuling: "from-emerald-500/30 to-teal-500/10",
  };
  return colors[brand] ?? "from-primary/20 to-accent/10";
};

export function CarCard({ car }: { car: Car }) {
  const badge = stockBadge(car.stock);
  return (
    <Link to="/car/$id" params={{ id: car.id }} className="group block">
      <Card className="overflow-hidden p-0 transition-all hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10">
        <div className={`relative aspect-[16/10] bg-gradient-to-br ${brandGradient(car.brand)} grid place-items-center overflow-hidden`}>
          {car.image_url ? (
            <img src={car.image_url} alt={car.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="text-center px-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{car.brand}</div>
              <div className="text-2xl font-display font-bold mt-1">{car.name.replace(car.brand, "").trim()}</div>
            </div>
          )}
          <Badge variant={badge.variant} className="absolute top-3 right-3">{badge.label}</Badge>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand}</div>
            <h3 className="font-display font-semibold text-lg leading-tight mt-0.5">{car.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />{car.year}</span>
            {car.transmission && <span className="inline-flex items-center gap-1"><Gauge className="size-3.5" />{car.transmission}</span>}
            {car.fuel_type && <span className="inline-flex items-center gap-1"><Fuel className="size-3.5" />{car.fuel_type}</span>}
            <span className="inline-flex items-center gap-1"><Package className="size-3.5" />{car.stock} unit</span>
          </div>
          <div className="pt-2 border-t border-border flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Harga</div>
              <div className="text-lg font-display font-bold text-gradient-primary">{formatIDR(car.selling_price)}</div>
            </div>
            <div className="text-xs font-medium text-primary group-hover:translate-x-1 transition-transform">Detail →</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
