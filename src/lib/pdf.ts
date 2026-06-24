import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIDR, formatUSDC, formatDate } from "./format";

export interface InvoicePDFData {
  invoice_number: string;
  created_at: string;
  payment_status: string;
  wallet_address: string;
  total_idr: number;
  total_usdc: number;
  tx_signature: string | null;
  items: Array<{ car_name: string | null; quantity: number; unit_price: number }>;
  dealer: {
    dealer_name: string;
    dealer_address?: string | null;
    dealer_phone?: string | null;
    dealer_email?: string | null;
    dealer_website?: string | null;
    dealer_wallet?: string | null;
  };
}

export const downloadInvoicePDF = (data: InvoicePDFData) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(13, 17, 28);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.dealer.dealer_name || "Solana Auto", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.dealer.dealer_address || "", 14, 21);
  doc.text(`${data.dealer.dealer_phone || ""}  ${data.dealer.dealer_email || ""}`, 14, 26);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageW - 14, 14, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoice_number, pageW - 14, 21, { align: "right" });
  doc.text(formatDate(data.created_at), pageW - 14, 26, { align: "right" });

  // Body
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Wallet", 14, 44);
  doc.text("Dealer Wallet", pageW / 2, 44);
  doc.setFont("helvetica", "normal");
  doc.text(data.wallet_address, 14, 50);
  doc.text(data.dealer.dealer_wallet || "-", pageW / 2, 50);

  // Items
  autoTable(doc, {
    startY: 60,
    head: [["Mobil", "Qty", "Harga Satuan", "Subtotal"]],
    body: data.items.map((i) => [
      i.car_name || "-",
      String(i.quantity),
      formatIDR(i.unit_price),
      formatIDR(i.unit_price * i.quantity),
    ]),
    headStyles: { fillColor: [13, 17, 28], textColor: 255 },
    styles: { fontSize: 9 },
  });

  type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? 60;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Total IDR:", pageW - 70, finalY + 10);
  doc.text(formatIDR(data.total_idr), pageW - 14, finalY + 10, { align: "right" });
  doc.text("Total USDC:", pageW - 70, finalY + 16);
  doc.text(formatUSDC(data.total_usdc), pageW - 14, finalY + 16, { align: "right" });
  doc.text("Status:", pageW - 70, finalY + 22);
  doc.text(data.payment_status.toUpperCase(), pageW - 14, finalY + 22, { align: "right" });

  if (data.tx_signature) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Transaction Hash:", 14, finalY + 30);
    doc.text(data.tx_signature, 14, finalY + 36);
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${data.dealer.dealer_website || ""} • Powered by Solana`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" },
  );

  doc.save(`${data.invoice_number}.pdf`);
};
