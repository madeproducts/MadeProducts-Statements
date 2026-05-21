"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { clientFormSchema } from "@/lib/schemas";

export async function createClientAction(formData: z.infer<typeof clientFormSchema>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const validation = clientFormSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const client = await db.client.create({
      data: validation.data,
    });
    
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { success: false, error: "Failed to create client." };
  }
}

export async function updateClientAction(id: string, formData: z.infer<typeof clientFormSchema>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Only Admin can update clients (optional detail: Staff can edit too, but let's restrict Delete to admin, and Edit to either, or restrict both to Admin. Let's make Edit available to staff but delete only for Admin)
  const validation = clientFormSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const client = await db.client.update({
      where: { id },
      data: validation.data,
    });

    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Error updating client:", error);
    return { success: false, error: "Failed to update client." };
  }
}

export async function deleteClientAction(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Only Admin can delete clients
  if (user.role !== Role.ADMIN) {
    return { success: false, error: "Access Denied. Only Administrators can delete clients." };
  }

  try {
    await db.client.delete({
      where: { id },
    });

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, error: "Failed to delete client. Make sure they have no outstanding statements." };
  }
}
