import { StatementStatus } from "@prisma/client";

// Formats an amount as Indian Rupee (INR)
export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === "number" ? amount : parseFloat(amount as string) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

// Formats a date to standard locale date string
export function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Calculates dynamic status based on amounts and due date
export function getStatementStatus(
  billAmount: number,
  receivedAmount: number,
  date: Date | string
): StatementStatus {
  const balance = billAmount - receivedAmount;
  if (balance <= 0) {
    return StatementStatus.PAID;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  if (due < today) {
    return StatementStatus.OVERDUE;
  }

  if (receivedAmount > 0) {
    return StatementStatus.PARTIAL;
  }

  return StatementStatus.PENDING;
}
