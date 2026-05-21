"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getStatementStatus } from "@/lib/utils";

export async function createStatementAction(formData: {
  clientId: string;
  invoiceNumber?: string;
  billAmount: number;
  date: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const { clientId, invoiceNumber, billAmount, date } = formData;

  if (!billAmount || billAmount <= 0) {
    return { success: false, error: "Bill amount must be a positive number." };
  }
  if (!date) {
    return { success: false, error: "Date is required." };
  }

  const receivedAmount = 0;
  const balanceAmount = billAmount;
  const parsedDate = new Date(date);
  const status = getStatementStatus(billAmount, receivedAmount, parsedDate);

  try {
    const statement = await db.statement.create({
      data: {
        clientId,
        invoiceNumber: invoiceNumber || null,
        productDetails: null,
        quantity: 1,
        billAmount,
        receivedAmount,
        balanceAmount,
        status,
        date: parsedDate,
      },
    });

    revalidatePath("/statements");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    return { success: true, data: statement };
  } catch (error: any) {
    console.error("Error creating statement:", error);
    return { success: false, error: "Failed to create statement." };
  }
}

export async function deleteStatementAction(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (user.role !== Role.ADMIN) {
    return { success: false, error: "Access Denied. Only Administrators can delete statements." };
  }

  try {
    const statement = await db.statement.findUnique({
      where: { id },
    });

    if (!statement) {
      return { success: false, error: "Statement not found." };
    }

    await db.statement.delete({
      where: { id },
    });

    revalidatePath("/statements");
    revalidatePath(`/clients/${statement.clientId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting statement:", error);
    return { success: false, error: "Failed to delete statement." };
  }
}
