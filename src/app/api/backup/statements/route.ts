import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // Validate the backup API key
    if (!key || key !== process.env.BACKUP_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all clients with their statements
    const clients = await db.client.findMany({
      include: {
        statements: {
          orderBy: { date: "asc" },
        },
      },
    });

    // Format the response for easy consumption by Google Apps Script
    const formattedData = clients.map((client) => ({
      clientId: client.id,
      companyName: client.companyName,
      clientName: client.name || "",
      statements: client.statements.map((stmt) => ({
        id: stmt.id,
        date: stmt.date.toISOString().split("T")[0],
        invoiceNumber: stmt.invoiceNumber || "",
        productDetails: stmt.productDetails || "",
        quantity: stmt.quantity,
        billAmount: Number(stmt.billAmount),
        receivedAmount: Number(stmt.receivedAmount),
        balanceAmount: Number(stmt.balanceAmount),
        status: stmt.status,
      })),
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Backup API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
