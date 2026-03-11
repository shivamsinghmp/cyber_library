import { jsPDF } from "jspdf";

type OrderItem = { name: string; price: number };

type InvoiceData = {
  transactionId: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  paymentId?: string | null;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
};

const PRIMARY = [139, 90, 43] as const;
const MUTED = [100, 95, 90] as const;
const LIGHT_BG = [250, 248, 245] as const;
const BORDER = [200, 195, 188] as const;

export function generateInvoicePdf(data: InvoiceData): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const w = doc.getPageWidth();
  const h = 297;
  const margin = 20;
  const contentW = w - 2 * margin;
  let y = 24;

  // ----- Header: Company (left) + Invoice # & Date (right) -----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text("Virtual Library", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Study Rooms & Subscriptions", margin, y + 5);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("INVOICE", w - margin - 50, y - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`# ${data.transactionId}`, w - margin - 50, y - 5);
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`Date: ${data.date}`, w - margin - 50, y + 2);
  doc.text(`Status: ${data.status}`, w - margin - 50, y + 7);

  y += 14;

  // ----- Bill To (if customer) -----
  if (data.customerName || data.customerEmail) {
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.setLineWidth(0.2);
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(margin, y, contentW * 0.45, 22, "FD");
    doc.rect(margin, y, contentW * 0.45, 22, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.text("BILL TO", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(data.customerName || "—", margin + 4, y + 12);
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(data.customerEmail || "", margin + 4, y + 17);
    y += 26;
  } else {
    y += 4;
  }

  // ----- Items table -----
  const colNo = 12;
  const colDesc = contentW - 12 - 35;
  const colAmt = 35;
  const rowH = 8;
  const tableTop = y;

  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(margin, y, contentW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("#", margin + 3, y + 5.5);
  doc.text("Description", margin + colNo + 2, y + 5.5);
  doc.text("Amount", margin + contentW - colAmt + 2, y + 5.5, { align: "right" });
  y += rowH;

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.15);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const items = data.items.length > 0 ? data.items : [{ name: "Subscription / Order", price: data.amount }];
  items.forEach((item, i) => {
    doc.rect(margin, y, colNo, rowH, "S");
    doc.rect(margin + colNo, y, colDesc, rowH, "S");
    doc.rect(margin + colNo + colDesc, y, colAmt, rowH, "S");
    doc.text(String(i + 1), margin + colNo / 2, y + 5.5, { align: "center" });
    doc.text(item.name, margin + colNo + 3, y + 5.5);
    doc.text(
      item.price > 0 ? `₹${item.price}` : "Free",
      margin + contentW - 3,
      y + 5.5,
      { align: "right" }
    );
    y += rowH;
  });

  y += 4;

  // ----- Total row -----
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Total", margin + contentW - colAmt - 10, y);
  doc.text(`₹${data.amount}`, margin + contentW - 3, y, { align: "right" });
  y += 10;

  if (data.paymentId) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`Payment ID: ${data.paymentId}`, margin, y);
    y += 8;
  }

  // ----- Notes / Thank you -----
  y += 6;
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.1);
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.rect(margin, y, contentW, 18, "FD");
  doc.rect(margin, y, contentW, 18, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Thank you for your payment. This is a computer-generated invoice.", margin + 4, y + 6);
  doc.text("For any queries, please quote the Invoice ID above.", margin + 4, y + 12);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.setFontSize(8);
  doc.text(`Invoice ID: ${data.transactionId} · Generated on ${new Date().toLocaleString("en-IN")}`, margin + 4, y + 16);

  // ----- Footer strip -----
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Virtual Library · Study Rooms & Subscriptions", margin, h - 5);
  doc.text("This document is proof of your transaction.", w - margin, h - 5, { align: "right" });

  doc.save(`Invoice-${data.transactionId}.pdf`);
}
