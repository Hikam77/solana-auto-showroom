import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatIDR } from "@/lib/format";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cars")({
  head: () => ({ meta: [{ title: "Inventaris Mobil — Admin" }] }),
  component: AdminCarsPage,
});

interface CarForm {
  id?: string;
  name: string;
  brand: string;
  year: number;
  color: string;
  transmission: string;
  fuel_type: string;
  description: string;
  selling_price: number;
  stock: number;
  image_url: string;
}

const EMPTY: CarForm = { name: "", brand: "", year: new Date().getFullYear(), color: "", transmission: "Automatic", fuel_type: "Bensin", description: "", selling_price: 0, stock: 0, image_url: "" };

function AdminCarsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CarForm>(EMPTY);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["admin-cars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (f: CarForm) => {
      const status = f.stock === 0 ? "out" : f.stock <= 3 ? "low" : "available";
      const payload = { ...f, status };
      if (f.id) {
        const { error } = await supabase.from("cars").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { id: _ignored, ...insertPayload } = payload;
        void _ignored;
        const { error } = await supabase.from("cars").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Mobil tersimpan");
      qc.invalidateQueries({ queryKey: ["admin-cars"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e) => toast.error("Gagal menyimpan", { description: (e as Error).message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mobil dihapus");
      qc.invalidateQueries({ queryKey: ["admin-cars"] });
    },
    onError: (e) => toast.error("Gagal menghapus", { description: (e as Error).message }),
  });

  const filtered = cars.filter((c) => !q || `${c.name} ${c.brand}`.toLowerCase().includes(q.toLowerCase()));

  const openEdit = (c: typeof cars[number]) => {
    setForm({
      id: c.id,
      name: c.name,
      brand: c.brand,
      year: c.year,
      color: c.color || "",
      transmission: c.transmission || "",
      fuel_type: c.fuel_type || "",
      description: c.description || "",
      selling_price: c.selling_price,
      stock: c.stock,
      image_url: c.image_url || "",
    });
    setOpen(true);
  };

  return (
    <AdminShell title="Inventaris Mobil" description="Kelola katalog mobil showroom Anda">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari mobil…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> Tambah Mobil</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Mobil" : "Mobil Baru"}</DialogTitle>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nama Mobil"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Merk"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
              <Field label="Tahun"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
              <Field label="Warna"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
              <Field label="Transmisi"><Input value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} /></Field>
              <Field label="Bahan Bakar"><Input value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} /></Field>
              <Field label="Harga (IDR)"><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></Field>
              <Field label="Stok"><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
              <Field label="URL Foto" full><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Deskripsi" full><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending || !form.name || !form.brand}>{upsert.isPending ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Memuat…</div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-muted-foreground">
              <tr>
                <th className="p-3">Mobil</th>
                <th className="p-3">Tahun</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Stok</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.brand} • {c.transmission} • {c.fuel_type}</div>
                  </td>
                  <td className="p-3">{c.year}</td>
                  <td className="p-3 font-medium">{formatIDR(c.selling_price)}</td>
                  <td className="p-3">{c.stock}</td>
                  <td className="p-3">
                    <Badge variant={c.stock === 0 ? "destructive" : c.stock <= 3 ? "secondary" : "default"}>
                      {c.stock === 0 ? "Habis" : c.stock <= 3 ? "Stok Menipis" : "Tersedia"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="size-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus {c.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(c.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada mobil</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </AdminShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
