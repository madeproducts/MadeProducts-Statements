import React from "react";
import db from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  MonthlyRevenueChart,
  RevenueDistributionChart,
} from "@/components/dashboard/Charts";
import {
  IndianRupee,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { getCurrentUser } from "@/lib/auth";
import DashboardClientSection from "@/components/dashboard/DashboardClientSection";

// Forces dynamic rendering to fetch fresh ledger states
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // 1. Fetch statistics and data in parallel
  const [
    clientsCount,
    statements,
    payments,
    allPayments,
    clientsWithStatements,
    allClients
  ] = await Promise.all([
    db.client.count(),
    db.statement.findMany({
      include: { client: true },
    }),
    db.payment.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { client: true },
    }),
    db.payment.findMany({
      orderBy: { date: "asc" },
    }),
    db.client.findMany({
      include: { statements: true },
    }),
    db.client.findMany({
      include: {
        statements: {
          select: {
            balanceAmount: true,
          },
        },
      },
      orderBy: {
        companyName: "asc",
      },
    })
  ]);

  // Calculate metrics
  let totalRevenue = 0;
  let pendingAmount = 0;
  statements.forEach((stmt) => {
    totalRevenue += Number(stmt.receivedAmount);
    pendingAmount += Number(stmt.balanceAmount);
  });

  // Calculate monthly revenue chart data
  const monthlyMap: { [key: string]: number } = {};
  allPayments.forEach((pay) => {
    const date = new Date(pay.date);
    const monthStr = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + Number(pay.receivedAmount);
  });

  const monthlyChartData = Object.keys(monthlyMap).map((m) => ({
    month: m,
    revenue: monthlyMap[m],
  }));

  // Revenue distribution data
  const distributionData = [
    { name: "Paid Revenue", value: totalRevenue },
    { name: "Pending Balance", value: pendingAmount },
  ];

  const topClients = clientsWithStatements
    .map((client) => {
      const totalBilled = client.statements.reduce((sum, s) => sum + Number(s.billAmount), 0);
      const totalPaid = client.statements.reduce((sum, s) => sum + Number(s.receivedAmount), 0);
      const balance = totalBilled - totalPaid;
      return {
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        totalBilled,
        totalPaid,
        balance,
      };
    })
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 5);

  const serializedClients = allClients.map((c) => ({
    ...c,
    statements: c.statements.map((s) => ({
      balanceAmount: Number(s.balanceAmount),
    })),
  }));

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Operations Dashboard</h1>
          <p className={styles.subtitle}>
            Made Products manufacturing ledger, payments, and collections status.
          </p>
        </div>
      </header>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total Revenue</span>
            <IndianRupee size={20} className={styles.metricIcon} style={{ color: "var(--success)" }} />
          </div>
          <div className={styles.metricValue}>{formatCurrency(totalRevenue)}</div>
          <div className={styles.metricFooter}>Total cleared collections</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Pending Balance</span>
            <Clock size={20} className={styles.metricIcon} style={{ color: "var(--primary)" }} />
          </div>
          <div className={styles.metricValue}>{formatCurrency(pendingAmount)}</div>
          <div className={styles.metricFooter}>Outstanding invoice values</div>
        </div>


        <div className={`${styles.metricCard} ${styles.metricCardFullSpan}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total Clients</span>
            <Users size={20} className={styles.metricIcon} style={{ color: "var(--info)" }} />
          </div>
          <div className={styles.metricValue}>{clientsCount}</div>
          <div className={styles.metricFooter}>Registered buyers</div>
        </div>
      </div>

      {/* Integrated Client Directory Section */}
      <DashboardClientSection
        initialClients={serializedClients}
        currentUserRole={user?.role || "STAFF"}
      />

      {/* Main Charts & Lists Grid */}
      <div className={styles.gridTwoCols}>
        {/* Left Side: Monthly chart and Top clients table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.panelCard}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <TrendingUp size={18} style={{ color: "var(--primary)" }} />
              <h2 className={styles.panelTitle}>Monthly Revenue Trend</h2>
            </div>
            <MonthlyRevenueChart data={monthlyChartData} />
          </div>

          <div className={styles.panelCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 className={styles.panelTitle}>Top Clients by Revenue</h2>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact Person</th>
                    <th style={{ textAlign: "right" }}>Total Billed</th>
                    <th style={{ textAlign: "right" }}>Total Paid</th>
                    <th style={{ textAlign: "right" }}>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((client) => (
                    <tr key={client.id}>
                      <td data-label="Company">
                        <Link href={`/clients/${client.id}`} style={{ fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                          {client.companyName}
                        </Link>
                      </td>
                      <td data-label="Contact">{client.name}</td>
                      <td data-label="Billed" style={{ textAlign: "right" }}>{formatCurrency(client.totalBilled)}</td>
                      <td data-label="Paid" style={{ textAlign: "right", color: "var(--success)", fontWeight: 500 }}>
                        {formatCurrency(client.totalPaid)}
                      </td>
                      <td data-label="Balance" style={{ textAlign: "right", color: client.balance > 0 ? "var(--warning)" : "var(--text-secondary)" }}>
                        {formatCurrency(client.balance)}
                      </td>
                    </tr>
                  ))}
                  {topClients.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No clients registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Distribution Pie chart and recent transactions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Collections Distribution</h2>
            <RevenueDistributionChart data={distributionData} />
          </div>

          <div className={styles.panelCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 className={styles.panelTitle}>Recent Payments</h2>
              <Link href="/statements" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600 }}>
                Billing Logs
              </Link>
            </div>
            <div className={styles.timeline}>
              {payments.map((p) => (
                <div key={p.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--success)" }}>₹</span>
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>{p.client.companyName}</span>
                      <span className={styles.timelineDate}>{formatDate(p.date)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      Paid <strong className={styles.timelineAmount}>{formatCurrency(Number(p.receivedAmount))}</strong> via <strong>{p.paymentMethod.replace("_", " ")}</strong>.
                    </p>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                  No payment events logged yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
