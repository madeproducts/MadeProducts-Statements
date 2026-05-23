import React from "react";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DashboardClientSection from "@/components/dashboard/DashboardClientSection";
import { FileText } from "lucide-react";

// Forces dynamic rendering to fetch fresh ledger states
export const revalidate = 0;

export default async function HomePage() {
  const user = await getCurrentUser();

  const allClients = await db.client.findMany({
    include: {
      statements: {
        orderBy: { date: "desc" },
      },
      payments: {
        orderBy: { date: "desc" },
      },
    },
    orderBy: {
      companyName: "asc",
    },
  });

  const serializedClients = allClients.map((client) => {
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
    <div>
      <header 
        style={{ 
          marginBottom: "32px", 
          paddingBottom: "24px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Home</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "15px" }}>
            Client Directory
          </p>
        </div>
        <a 
          href="https://invoice-madeproduts.vercel.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            backgroundColor: "#1E293B",
            color: "white",
            padding: "10px 18px",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background-color 0.2s",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
          }}
        >
          <FileText size={16} />
          Invoice
        </a>
      </header>

      <DashboardClientSection
        initialClients={serializedClients}
        currentUserRole={user?.role || "STAFF"}
      />
    </div>
  );
}
