import React from "react";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import StatementsContainer from "@/components/statements/StatementsContainer";

export const revalidate = 0;

export default async function StatementsPage() {
  const user = await getCurrentUser();

  const clients = await db.client.findMany({
    include: {
      statements: {
        orderBy: { date: "desc" },
      },
      payments: {
        orderBy: { date: "desc" },
      },
    },
    orderBy: { companyName: "asc" },
  });

  const serializedClients = clients.map((client) => {
    let totalBilled = 0;
    let totalReceived = 0;
    let balanceAmount = 0;

    const serializedStatements = client.statements.map((stmt) => {
      totalBilled += Number(stmt.billAmount);
      totalReceived += Number(stmt.receivedAmount);
      balanceAmount += Number(stmt.balanceAmount);

      return {
        ...stmt,
        billAmount: Number(stmt.billAmount),
        receivedAmount: Number(stmt.receivedAmount),
        balanceAmount: Number(stmt.balanceAmount),
        date: stmt.date.toISOString(),
        createdAt: stmt.createdAt.toISOString(),
      };
    });

    const serializedPayments = client.payments.map((pay) => ({
      ...pay,
      receivedAmount: Number(pay.receivedAmount),
      date: pay.date.toISOString(),
      createdAt: pay.createdAt.toISOString(),
    }));

    return {
      ...client,
      createdAt: client.createdAt.toISOString(),
      totalBilled,
      totalReceived,
      balanceAmount,
      statements: serializedStatements,
      payments: serializedPayments,
    };
  });

  return (
    <StatementsContainer
      clients={serializedClients}
      currentUserRole={user?.role || "STAFF"}
    />
  );
}
