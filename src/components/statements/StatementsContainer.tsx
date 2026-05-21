"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Download, Share2, ExternalLink } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateClientStatementPDF } from "@/lib/pdf";
import styles from "@/app/(authenticated)/statements/statements.module.css";
import tableStyles from "@/app/(authenticated)/dashboard/dashboard.module.css";

interface Statement {
  id: string;
  invoiceNumber: string | null;
  productDetails: string | null;
  billAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  status: string;
  date: string;
}

interface ClientRow {
  id: string;
  name: string | null;
  companyName: string;
  phone: string | null;
  email: string | null;
  totalBilled: number;
  totalReceived: number;
  balanceAmount: number;
  statements: Statement[];
  payments?: any[];
}

interface StatementsContainerProps {
  clients: ClientRow[];
  currentUserRole: string;
}

export default function StatementsContainer({
  clients,
}: StatementsContainerProps) {
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("balance-desc");

  const totalBilled = useMemo(() => clients.reduce((s, c) => s + c.totalBilled, 0), [clients]);
  const totalCollected = useMemo(() => clients.reduce((s, c) => s + c.totalReceived, 0), [clients]);
  const totalPending = useMemo(() => clients.reduce((s, c) => s + c.balanceAmount, 0), [clients]);
  const clientsWithDuesCount = useMemo(() => clients.filter((c) => c.balanceAmount > 0).length, [clients]);

  const filtered = useMemo(() => {
    let rows = [...clients];
    if (balanceFilter === "HAS_DUES") rows = rows.filter((c) => c.balanceAmount > 0);
    if (balanceFilter === "CLEARED") rows = rows.filter((c) => c.balanceAmount <= 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          (c.name && c.name.toLowerCase().includes(q))
      );
    }
    
    rows.sort((a, b) => {
      switch (sortBy) {
        case "balance-desc": return b.balanceAmount - a.balanceAmount;
        case "balance-asc": return a.balanceAmount - b.balanceAmount;
        case "billed-desc": return b.totalBilled - a.totalBilled;
        case "name-asc": return a.companyName.localeCompare(b.companyName);
        default: return b.balanceAmount - a.balanceAmount;
      }
    });
    return rows;
  }, [clients, balanceFilter, search, sortBy]);

  const handleDownload = async (client: ClientRow) => {
    const doc = await generateClientStatementPDF(client, client.statements, client.balanceAmount);
    doc.save(`${client.companyName.replace(/[^a-z0-9]/gi, '_')}_Statement.pdf`);
  };

  const handleShare = async (client: ClientRow) => {
    const doc = await generateClientStatementPDF(client, client.statements, client.balanceAmount);
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], `${client.companyName.replace(/[^a-z0-9]/gi, '_')}_Statement.pdf`, { type: "application/pdf" });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${client.companyName} Statement`,
          text: `Here is the statement for ${client.companyName}. Balance Due: ${formatCurrency(client.balanceAmount)}`
        });
      } catch (err) {
        console.error("Share failed", err);
        fallbackShare(client);
      }
    } else {
      fallbackShare(client);
    }
  };

  const fallbackShare = (client: ClientRow) => {
    handleDownload(client);
    const msg = `Hello ${client.name || "Customer"}, please find your statement attached. Total Balance Due: ${formatCurrency(client.balanceAmount)}.`;
    let phone = (client.phone || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    if (phone) {
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  return (
    <div>
      <header className={styles.headerSection}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Client Statements</h1>
          <p className={styles.subtitle}>View client balances and generate consolidated statements.</p>
        </div>
      </header>

      {/* Summary Strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryChip}>
          <span className={styles.chipLabel}>Total Billed</span>
          <span className={styles.chipValue}>{formatCurrency(totalBilled)}</span>
        </div>
        <div className={styles.summaryChip}>
          <span className={styles.chipLabel}>Collected</span>
          <span className={styles.chipValue} style={{ color: "var(--success)" }}>{formatCurrency(totalCollected)}</span>
        </div>
        <div className={styles.summaryChip}>
          <span className={styles.chipLabel}>Pending Balance</span>
          <span className={styles.chipValue} style={{ color: "var(--warning)" }}>{formatCurrency(totalPending)}</span>
        </div>
        <div className={styles.summaryChip}>
          <span className={styles.chipLabel}>Clients w/ Dues</span>
          <span className={styles.chipValue} style={{ color: clientsWithDuesCount > 0 ? "var(--danger)" : "var(--text-primary)" }}>{clientsWithDuesCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar} style={{ marginBottom: "var(--spacing-md)" }}>
        <div className={styles.searchWrap}>
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select className={styles.select} value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
          <option value="ALL">All Clients</option>
          <option value="HAS_DUES">Has Dues</option>
          <option value="CLEARED">Fully Paid</option>
        </select>

        <select className={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="balance-desc">Highest Balance Due</option>
          <option value="balance-asc">Lowest Balance Due</option>
          <option value="billed-desc">Highest Billed Amount</option>
          <option value="name-asc">Client Name (A-Z)</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Client</th>
                <th style={{ textAlign: "right" }}>Total Billed</th>
                <th style={{ textAlign: "right" }}>Paid</th>
                <th style={{ textAlign: "right" }}>Balance Due</th>
                <th style={{ textAlign: "center" }}>Statements</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/clients/${client.id}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                      {client.companyName}<ExternalLink size={12} />
                    </Link>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{client.name || "No contact info"}</div>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatCurrency(client.totalBilled)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", color: "var(--success)", fontWeight: 500 }}>{formatCurrency(client.totalReceived)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: client.balanceAmount > 0 ? 600 : 400, color: client.balanceAmount > 0 ? "var(--warning)" : "var(--text-secondary)" }}>
                    {formatCurrency(client.balanceAmount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", padding: "4px 8px", borderRadius: "12px" }}>
                      {client.statements.length} {client.statements.length === 1 ? 'record' : 'records'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexWrap: "nowrap" }}>
                      <button
                        title="Download Statement PDF"
                        onClick={() => handleDownload(client)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        title="Share Statement PDF"
                        onClick={() => handleShare(client)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center" }}
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                    {search || balanceFilter !== "ALL" ? "No clients match your search criteria." : "No clients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
