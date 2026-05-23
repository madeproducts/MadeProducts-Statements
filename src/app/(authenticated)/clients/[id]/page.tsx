import React from "react";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ClientProfileContainer from "@/components/clients/ClientProfileContainer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const client = await db.client.findUnique({
    where: { id },
    include: {
      statements: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  // Serialize Decimal types to plain numbers for client component
  const serializedClient = {
    ...client,
    createdAt: client.createdAt.toISOString(),
    statements: client.statements.map((stmt) => ({
      ...stmt,
      billAmount: Number(stmt.billAmount),
      receivedAmount: Number(stmt.receivedAmount),
      balanceAmount: Number(stmt.balanceAmount),
      date: stmt.date.toISOString(),
      createdAt: stmt.createdAt.toISOString(),
    })),
    payments: client.payments.map((pay) => ({
      ...pay,
      receivedAmount: Number(pay.receivedAmount),
      date: pay.date.toISOString(),
      createdAt: pay.createdAt.toISOString(),
    })),
  };

  return (
    <div>
      <Link
        href="/home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--text-muted)",
          fontSize: "14px",
          fontWeight: 500,
          marginBottom: "var(--spacing-md)",
          transition: "color var(--transition-fast)",
        }}
      >
        <ChevronLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      <ClientProfileContainer
        client={serializedClient}
        statements={serializedClient.statements}
        currentUserRole={user?.role || "STAFF"}
      />
    </div>
  );
}
