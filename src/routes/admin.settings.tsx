import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: AdminSettingsPage,
});

interface SettingsForm {
  dealer_name: string;
  dealer_logo: string;
  dealer_address: string;
  dealer_phone: string;
  dealer_email: string;
  dealer_website: string;
  dealer_wallet: string;
  solana_network: string;
  idr_per_usdc: number;
}

const EMPTY: SettingsForm = { dealer_name: "", dealer_logo: "", dealer_address: "", dealer_phone: "", dealer_email: "", dealer_website: "", dealer_wallet: "", solana_network: "devnet", idr_per_usdc: 16000 };

function AdminSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data && !loaded) {
      setForm({
        dealer_name: data.dealer_name || "",
        dealer_logo: data.dealer_logo || "",
        dealer_address: data.dealer_address || "",
        dealer_phone: data.dealer_phone || "",
        dealer_email: data.dealer_email || "",
        dealer_website: data.dealer_website || "",
        dealer_wallet: data.dealer_wallet || "",
        solana_network: data.solana_network || "devnet",
        idr_per_usdc: Number(data.idr_per_usdc) || 16000,
      });
      setLoaded(true);
    }
  }, [data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.dealer_wallet && !isValidAddress(form.dealer_wallet)) {
        throw new Error("Alamat dealer wallet bukan public key Solana yang valid");
      }
      if (data?.id) {
        const { error } = await supabase.from("settings").update(form).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Settings tersimpan");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["checkout"] });
    },
    onError: (e) => toast.error("Gagal menyimpan", { description: (e as Error).message }),
  });

  return (
    <AdminShell title="Settings" description="Atur informasi dealer dan wallet penerima pembayaran">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 space-y-4">
          <h3 className="font-display font-semibold">Informasi Dealer</h3>
          <Field label="Nama Dealer"><Input value={form.dealer_name} onChange={(e) => setForm({ ...form, dealer_name: e.target.value })} /></Field>
          <Field label="Logo URL"><Input value={form.dealer_logo} onChange={(e) => setForm({ ...form, dealer_logo: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Alamat"><Input value={form.dealer_address} onChange={(e) => setForm({ ...form, dealer_address: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telepon"><Input value={form.dealer_phone} onChange={(e) => setForm({ ...form, dealer_phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.dealer_email} onChange={(e) => setForm({ ...form, dealer_email: e.target.value })} /></Field>
          </div>
          <Field label="Website"><Input value={form.dealer_website} onChange={(e) => setForm({ ...form, dealer_website: e.target.value })} placeholder="https://…" /></Field>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-display font-semibold">Web3 Configuration</h3>
          <Field label="Wallet Solana Penerima Pembayaran">
            <Input value={form.dealer_wallet} onChange={(e) => setForm({ ...form, dealer_wallet: e.target.value })} placeholder="Public key Solana, contoh: 7xKX…" className="font-mono" />
            <p className="text-xs text-muted-foreground mt-1">Semua pembayaran USDC akan dikirim ke alamat ini.</p>
          </Field>
          <Field label="Jaringan Solana">
            <Select value={form.solana_network} onValueChange={(v) => setForm({ ...form, solana_network: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="devnet">Devnet (untuk testing)</SelectItem>
                <SelectItem value="mainnet-beta">Mainnet (produksi)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kurs IDR per 1 USDC">
            <Input type="number" value={form.idr_per_usdc} onChange={(e) => setForm({ ...form, idr_per_usdc: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground mt-1">Konversi harga dari IDR ke USDC saat checkout.</p>
          </Field>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="size-4" /> {save.isPending ? "Menyimpan…" : "Simpan Settings"}</Button>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
