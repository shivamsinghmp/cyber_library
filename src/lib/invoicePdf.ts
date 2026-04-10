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
  customerPhone?: string;
};

export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const w = 210;
  const m = 20;

  // Colors based on the required layout but adapted to "The Cyber Library" luxury feel
  const PRIMARY_BG = [20, 25, 30]; // Deep Charcoal/Navy for the big header
  const TABLE_HEADER = [35, 45, 55]; // Slightly lighter for table
  const TEXT_DARK = [40, 40, 40];
  const TEXT_MUTED = [120, 120, 120];
  const BORDER = [210, 210, 210];

  // --- BIG CURVE/SHAPE HEADER ---
  // Since jsPDF doesn't do smooth bezier gradients easily, we create a very striking geometric solid header
  doc.setFillColor(PRIMARY_BG[0], PRIMARY_BG[1], PRIMARY_BG[2]);
  doc.rect(0, 0, w, 45, "F");
  
  // A sleek accent line at the bottom of the header block
  doc.setFillColor(196, 164, 119); // Gold/Wood
  doc.rect(0, 45, w, 2, "F");

  // Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", m, 28);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`NO: ${data.transactionId}`, w - m, 28, { align: "right" });

  let y = 65;

  // --- BILL TO / FROM SECTION ---
  doc.setFontSize(16);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text("Bill To:", m, y);
  doc.text("From:", w - m, y, { align: "right" });

  y += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  
  // Bill To details
  const customerName = data.customerName || "Member";
  doc.text(customerName, m, y);
  
  if (data.customerEmail) {
    doc.text(data.customerEmail, m, y + 6);
  }
  if (data.customerPhone) {
    doc.text(data.customerPhone, m, y + 12);
  }
  
  // From details
  doc.text("The Cyber Library", w - m, y, { align: "right" });
  doc.text("support@cyberlib.in", w - m, y + 6, { align: "right" });
  doc.text("www.cyberlib.in", w - m, y + 12, { align: "right" });

  y += 24;

  // --- DATE ---
  doc.setFontSize(11);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`Date: ${data.date}`, m, y);

  y += 12;

  // --- TABLE HEADER ---
  const contentW = w - 2 * m;
  const colDescW = contentW * 0.45;
  const colQtyW = contentW * 0.15;
  const colPriceW = contentW * 0.20;
  const colTotalW = contentW * 0.20;
  const rowH = 10;

  doc.setFillColor(TABLE_HEADER[0], TABLE_HEADER[1], TABLE_HEADER[2]);
  doc.rect(m, y, contentW, rowH, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  
  let currentX = m;
  doc.text("Description", currentX + colDescW / 2, y + 6.5, { align: "center" });
  currentX += colDescW;
  doc.text("Qty", currentX + colQtyW / 2, y + 6.5, { align: "center" });
  currentX += colQtyW;
  doc.text("Price", currentX + colPriceW / 2, y + 6.5, { align: "center" });
  currentX += colPriceW;
  doc.text("Total", currentX + colTotalW / 2, y + 6.5, { align: "center" });
  
  y += rowH;

  // --- TABLE ROWS ---
  const items = data.items.length > 0 ? data.items : [{ name: "Cyber Library Subscription", price: data.amount }];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);

  items.forEach((item) => {
    // Draw cells
    currentX = m;
    doc.rect(currentX, y, colDescW, rowH, "S");
    doc.text(item.name, currentX + 3, y + 6.5);
    currentX += colDescW;
    
    doc.rect(currentX, y, colQtyW, rowH, "S");
    doc.text("1", currentX + colQtyW / 2, y + 6.5, { align: "center" });
    currentX += colQtyW;
    
    const priceText = item.price > 0 ? `INR ${item.price}` : "0.00";
    doc.rect(currentX, y, colPriceW, rowH, "S");
    doc.text(priceText, currentX + colPriceW / 2, y + 6.5, { align: "center" });
    currentX += colPriceW;
    
    doc.rect(currentX, y, colTotalW, rowH, "S");
    doc.text(priceText, currentX + colTotalW / 2, y + 6.5, { align: "center" });
    
    y += rowH;
  });

  // Inner lines for aesthetic
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);

  y += 5;

  // --- SUB TOTAL BLOCK (Aligning to the right columns) ---
  const totalBoxW = colPriceW + colTotalW;
  const totalBoxX = w - m - totalBoxW;
  
  doc.setFillColor(PRIMARY_BG[0], PRIMARY_BG[1], PRIMARY_BG[2]);
  doc.rect(totalBoxX, y, totalBoxW, rowH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Total Paid", totalBoxX + colPriceW / 2, y + 6.5, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${data.amount.toLocaleString('en-IN')}`, totalBoxX + colPriceW + colTotalW / 2, y + 6.5, { align: "center" });

  y += 30;

  // --- PAYMENT / NOTE SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text("Payment Information:", m, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Status:", m, y);
  doc.setFont("helvetica", "normal");
  const isReqSuccess = data.status.toUpperCase() === "SUCCESS";
  doc.setTextColor(isReqSuccess ? 30 : 200, isReqSuccess ? 120 : 50, isReqSuccess ? 60 : 50);
  doc.text(data.status.toUpperCase(), m + 22, y);

  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  if (data.paymentId) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Ref ID:", m, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(data.paymentId, m + 22, y);
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text("Email:", m, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("support@cyberlib.in", m + 22, y);

  // --- BIG "Thank You!" ---
  // The provided layout has a huge "Thank You!" at the bottom right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(PRIMARY_BG[0], PRIMARY_BG[1], PRIMARY_BG[2]);
  doc.text("Thank You!", w - m, y, { align: "right" });

  doc.save(`Invoice_${data.transactionId}.pdf`);
}
