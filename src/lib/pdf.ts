import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";

export const generateClientStatementPDF = async (
  client: any,
  statements: any[],
  pendingBalance: number
) => {
  const doc = new jsPDF();
  
  try {
    const img = new Image();
    img.src = "/logo.png";
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; 
    });
    // Add logo (adjust dimensions as needed)
    doc.addImage(img, "PNG", 14, 15, 20, 20);
  } catch (e) {
    console.error("Failed to load logo", e);
  }
  
  const formatPdfCurrency = (amount: number) => formatCurrency(amount).replace('₹', 'Rs. ');

  // Header - Right aligned Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // var(--text-primary)
  doc.text("STATEMENT OF ACCOUNT", 196, 25, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 196, 32, { align: "right" });

  // Company Info (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("MADE PRODUCTS", 38, 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Contact no: +91 8589907591", 38, 28);
  doc.text("Website: www.madeproducts.in", 38, 34);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 45, 196, 45);

  // Client Info & Summary Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("BILL TO:", 14, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(client.companyName || "N/A", 14, 62);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  let yPos = 68;
  if (client.name) { doc.text(`Contact: ${client.name}`, 14, yPos); yPos += 5; }
  if (client.phone) { doc.text(`Phone: ${client.phone}`, 14, yPos); yPos += 5; }
  if (client.email) { doc.text(`Email: ${client.email}`, 14, yPos); yPos += 5; }

  // Outstanding Balance Summary
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, 52, 76, 28, 2, 2, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL OUTSTANDING", 158, 62, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38); // Red-ish for balance
  doc.text(formatPdfCurrency(pendingBalance), 158, 72, { align: "center" });

  // Unified ledger entries for Statement view
  const ledgerEntries = [
    ...statements.map((stmt) => ({
      id: stmt.id,
      type: "BILL",
      date: new Date(stmt.date),
      reference: stmt.invoiceNumber,
      description: "Invoice",
      productDetails: stmt.productDetails,
      quantity: stmt.quantity,
      billAmount: stmt.billAmount,
      receivedAmount: null,
      balanceAmount: stmt.balanceAmount,
      status: stmt.status,
    })),
    ...client.payments.map((pay: any) => ({
      id: pay.id,
      type: "PAYMENT",
      date: new Date(pay.date),
      reference: pay.referenceNumber,
      description: `Payment (${pay.paymentMethod.replace("_", " ")})`,
      productDetails: pay.notes,
      quantity: null,
      billAmount: null,
      receivedAmount: pay.receivedAmount,
    }))
  ].sort((a, b) => {
    const timeDiff = a.date.getTime() - b.date.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.type === "BILL" && b.type === "PAYMENT") return -1;
    if (a.type === "PAYMENT" && b.type === "BILL") return 1;
    return 0;
  });

  let currentBalance = 0;
  const tableData = ledgerEntries.map(entry => {
    if (entry.type === "BILL") {
      currentBalance += (entry.billAmount || 0);
    } else if (entry.type === "PAYMENT") {
      currentBalance -= (entry.receivedAmount || 0);
    }
    return [
      formatDate(entry.date.toISOString()),
      entry.type === "BILL" ? `${entry.description} ${entry.reference ? `#${entry.reference}` : ""}` : entry.description,
      entry.billAmount !== null ? formatPdfCurrency(entry.billAmount) : "-",
      entry.receivedAmount !== null ? formatPdfCurrency(entry.receivedAmount) : "-",
      formatPdfCurrency(currentBalance)
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [['Date', 'Transaction Details', 'Billed Amount', 'Received Amount', 'Balance']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [79, 70, 229], // Primary Indigo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    styles: {
      fontSize: 9,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 90;
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your business. Please contact us if you have any questions regarding this statement.", 14, finalY + 15);

  return doc;
};
