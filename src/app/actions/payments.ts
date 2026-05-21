"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PaymentMethod, Role } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStatementStatus } from "@/lib/utils";
import { paymentFormSchema } from "@/lib/schemas";

export async function recalculateClientStatements(clientId: string, tx: any) {
  // Fetch all statements ordered by date ASC
  const statements = await tx.statement.findMany({
    where: { clientId },
    orderBy: { date: "asc" },
  });

  // Fetch all payments for client
  const payments = await tx.payment.findMany({
    where: { clientId },
  });

  let remainingPayment = payments.reduce((sum: number, p: any) => sum + Number(p.receivedAmount), 0);

  // Update each statement
  for (const stmt of statements) {
    const billAmount = Number(stmt.billAmount);
    const receivedAmount = Math.min(billAmount, remainingPayment);
    remainingPayment -= receivedAmount;
    
    const balanceAmount = billAmount - receivedAmount;
    const status = getStatementStatus(billAmount, receivedAmount, stmt.date);

    await tx.statement.update({
      where: { id: stmt.id },
      data: {
        receivedAmount,
        balanceAmount,
        status,
      },
    });
  }
}

export async function addPaymentAction(formData: z.infer<typeof paymentFormSchema>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const validation = paymentFormSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { clientId, receivedAmount, date, paymentMethod, referenceNumber, receiptUrl, notes } = validation.data;
  const parsedPaymentDate = new Date(date);

  try {
    const result = await db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new Error("Client not found");
      }

      const payment = await tx.payment.create({
        data: {
          clientId,
          receivedAmount,
          date: parsedPaymentDate,
          paymentMethod: paymentMethod as PaymentMethod,
          referenceNumber: referenceNumber || null,
          receiptUrl: receiptUrl || null,
          notes,
        },
      });

      // Recalculate statement balances via FIFO
      await recalculateClientStatements(clientId, tx);

      return { payment, clientId };
    });

    revalidatePath("/statements");
    revalidatePath(`/clients/${result.clientId}`);
    revalidatePath("/dashboard");
    return { success: true, data: result.payment };
  } catch (error: any) {
    console.error("Error adding payment:", error);
    return { success: false, error: error.message || "Failed to add payment record." };
  }
}

export async function deletePaymentAction(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (user.role !== Role.ADMIN) {
    return { success: false, error: "Access Denied. Only Administrators can delete payments." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      const clientId = payment.clientId;

      await tx.payment.delete({
        where: { id },
      });

      // Recalculate statement balances via FIFO
      await recalculateClientStatements(clientId, tx);

      return { clientId };
    });

    revalidatePath("/statements");
    revalidatePath(`/clients/${result.clientId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return { success: false, error: error.message || "Failed to delete payment record." };
  }
}
