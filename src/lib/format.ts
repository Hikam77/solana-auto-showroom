export const formatIDR = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n;
  if (!isFinite(v)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
};

export const formatUSDC = (n: number | string, digits = 2) => {
  const v = typeof n === "string" ? Number(n) : n;
  if (!isFinite(v)) return "0.00 USDC";
  return `${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} USDC`;
};

export const formatSOL = (n: number | string, digits = 4) => {
  const v = typeof n === "string" ? Number(n) : n;
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })} SOL`;
};

export const idrToUsdc = (idr: number, rate: number) => {
  if (!rate || rate <= 0) return 0;
  return Math.round((idr / rate) * 1_000_000) / 1_000_000;
};

export const shortAddr = (addr?: string | null, n = 4) => {
  if (!addr) return "";
  if (addr.length <= n * 2 + 3) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
};

export const formatDate = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

export const todayInvoiceNumber = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `INV-${y}${m}${day}-${rand}`;
};
