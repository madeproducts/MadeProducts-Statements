"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Share2,
  ExternalLink,
  ChevronDown,
  Users,
  IndianRupee,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { generateClientStatementPDF } from "@/lib/pdf";
import styles from "@/app/(authenticated)/statements/statements.module.css";

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

export default function StatementsContainer({ clients }: StatementsContainerProps) {
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("balance-desc");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

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
    setLoadingId(client.id);
    try {
      const doc = await generateClientStatementPDF(client, client.statements, client.balanceAmount);
      doc.save(`${client.companyName.replace(/[^a-z0-9]/gi, "_")}_Statement.pdf`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleShare = async (client: ClientRow) => {
    setSharingId(client.id);
    try {
      const doc = await generateClientStatementPDF(client, client.statements, client.balanceAmount);
      const pdfBlob = doc.output("blob");
      const fileName = `${client.companyName.replace(/[^a-z0-9]/gi, "_")}_Statement.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${client.companyName} Statement`,
          text: `Statement for ${client.companyName}. Balance Due: ${formatCurrency(client.balanceAmount)}`,
        });
      } else {
        // Fallback: download + WhatsApp
        doc.save(fileName);
        const msg = `Hello ${client.name || "Customer"}, please find your statement attached. Total Balance Due: ${formatCurrency(client.balanceAmount)}.`;
        let phone = (client.phone || "").replace(/\D/g, "");
        if (phone.length === 10) phone = "91" + phone;
        if (phone) {
          window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
        }
      }
    } catch (err) {
      console.error("Share failed", err);
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <header className={styles.headerSection}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Client Statements</h1>
          <p className={styles.subtitle}>
            View client balances and download or share consolidated statements as PDF.
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryChip}>
          <div className={styles.chipIconWrap} style={{ background: "rgba(99,102,241,0.12)" }}>
            <TrendingUp size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <span className={styles.chipLabel}>Total Billed</span>
            <span className={styles.chipValue}>{formatCurrency(totalBilled)}</span>
          </div>
        </div>
        <div className={styles.summaryChip}>
          <div className={styles.chipIconWrap} style={{ background: "rgba(34,197,94,0.12)" }}>
            <IndianRupee size={18} style={{ color: "var(--success)" }} />
          </div>
          <div>
            <span className={styles.chipLabel}>Collected</span>
            <span className={styles.chipValue} style={{ color: "var(--success)" }}>
              {formatCurrency(totalCollected)}
            </span>
          </div>
        </div>
        <div className={styles.summaryChip}>
          <div className={styles.chipIconWrap} style={{ background: "rgba(245,158,11,0.12)" }}>
            <AlertCircle size={18} style={{ color: "var(--warning)" }} />
          </div>
          <div>
            <span className={styles.chipLabel}>Pending Balance</span>
            <span className={styles.chipValue} style={{ color: "var(--warning)" }}>
              {formatCurrency(totalPending)}
            </span>
          </div>
        </div>
        <div className={styles.summaryChip}>
          <div className={styles.chipIconWrap} style={{ background: "rgba(239,68,68,0.12)" }}>
            <Users size={18} style={{ color: "var(--danger)" }} />
          </div>
          <div>
            <span className={styles.chipLabel}>Clients w/ Dues</span>
            <span
              className={styles.chipValue}
              style={{ color: clientsWithDuesCount > 0 ? "var(--danger)" : "var(--text-primary)" }}
            >
              {clientsWithDuesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
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

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value)}
          >
            <option value="ALL">All Clients</option>
            <option value="HAS_DUES">Has Dues</option>
            <option value="CLEARED">Fully Paid</option>
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="balance-desc">Highest Balance</option>
            <option value="balance-asc">Lowest Balance</option>
            <option value="billed-desc">Highest Billed</option>
            <option value="name-asc">Name (A–Z)</option>
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>

        <span className={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? "client" : "clients"}
        </span>
      </div>

      {/* Client List Table */}
      <div className={styles.tableCard}>
        {/* Table Header */}
        <div className={styles.tableHeader}>
          <div className={styles.colClient}>Client</div>
          <div className={styles.colNum}>Total Billed</div>
          <div className={styles.colNum}>Paid</div>
          <div className={styles.colNum}>Balance Due</div>
          <div className={styles.colCenter}>Records</div>
          <div className={styles.colActions}>Actions</div>
        </div>

        {/* Rows */}
        <div className={styles.tableBody}>
          {filtered.map((client) => (
            <div key={client.id} className={styles.tableRow}>
              {/* Client Name */}
              <div className={styles.colClient}>
                <Link
                  href={`/clients/${client.id}`}
                  className={styles.clientLink}
                >
                  {client.companyName}
                  <ExternalLink size={12} style={{ flexShrink: 0 }} />
                </Link>
                {client.name && (
                  <span className={styles.clientContact}>{client.name}</span>
                )}
              </div>

              {/* Total Billed */}
              <div className={styles.colNum}>
                <span className={styles.amountLabel}>Billed</span>
                <span className={styles.amount}>{formatCurrency(client.totalBilled)}</span>
              </div>

              {/* Paid */}
              <div className={styles.colNum}>
                <span className={styles.amountLabel}>Paid</span>
                <span className={styles.amount} style={{ color: "var(--success)" }}>
                  {formatCurrency(client.totalReceived)}
                </span>
              </div>

              {/* Balance Due */}
              <div className={styles.colNum}>
                <span className={styles.amountLabel}>Balance</span>
                <span
                  className={styles.balanceBadge}
                  data-positive={client.balanceAmount > 0}
                >
                  {formatCurrency(client.balanceAmount)}
                </span>
              </div>

              {/* Records count */}
              <div className={styles.colCenter}>
                <span className={styles.recordsPill}>
                  {client.statements.length} {client.statements.length === 1 ? "record" : "records"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className={styles.colActions}>
                <button
                  className={styles.btnDownload}
                  onClick={() => handleDownload(client)}
                  disabled={loadingId === client.id}
                  title="Download Statement PDF"
                >
                  <Download size={14} />
                  <span>{loadingId === client.id ? "Generating..." : "Download PDF"}</span>
                </button>
                <button
                  className={styles.btnShare}
                  onClick={() => handleShare(client)}
                  disabled={sharingId === client.id}
                  title="Share Statement PDF"
                >
                  <Share2 size={14} />
                  <span>{sharingId === client.id ? "Sharing..." : "Share PDF"}</span>
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={40} style={{ color: "var(--border-hover)", marginBottom: "12px" }} />
              <p className={styles.emptyTitle}>No clients found</p>
              <p className={styles.emptySubtitle}>
                {search || balanceFilter !== "ALL"
                  ? "Try adjusting your search or filter criteria."
                  : "No clients have been added yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
