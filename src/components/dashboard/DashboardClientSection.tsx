"use client";

import React, { useState, useTransition } from "react";
import { Search, Plus, ExternalLink, Loader, Download, Share2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useToast } from "../ui/Toast";
import Modal from "../ui/Modal";
import { createClientAction } from "@/app/actions/clients";
import { clientFormSchema } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import { generateClientStatementPDF } from "@/lib/pdf";
import { useRouter } from "next/navigation";
import styles from "@/app/(authenticated)/dashboard/dashboard.module.css";
import statementsStyles from "@/app/(authenticated)/statements/statements.module.css";

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientWithStatements {
  id: string;
  name: string | null;
  companyName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  totalBilled: number;
  totalReceived: number;
  balanceAmount: number;
  statements: any[];
  payments: any[];
}

interface DashboardClientSectionProps {
  initialClients: ClientWithStatements[];
  currentUserRole: string;
}

export default function DashboardClientSection({
  initialClients,
  currentUserRole,
}: DashboardClientSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      companyName: "",
      phone: "",
      address: "",
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    startTransition(async () => {
      const res = await createClientAction(data);
      if (res.success) {
        showToast(`Client "${data.companyName}" added successfully.`, "success");
        reset();
        setIsModalOpen(false);
      } else {
        showToast(res.error || "Failed to add client.", "error");
      }
    });
  };

  const getClientBalance = (client: ClientWithStatements) => {
    return client.balanceAmount;
  };

  const handleDownload = async (client: ClientWithStatements) => {
    setLoadingId(client.id);
    try {
      const doc = await generateClientStatementPDF(client as any, client.statements, client.balanceAmount);
      doc.save(`${client.companyName.replace(/[^a-z0-9]/gi, "_")}_Statement.pdf`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleShare = async (client: ClientWithStatements) => {
    setSharingId(client.id);
    try {
      const doc = await generateClientStatementPDF(client as any, client.statements, client.balanceAmount);
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

  const filteredClients = initialClients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.clientSection}>
      {/* Section Header */}
      <div className={styles.clientSectionHeader}>
        <div>
          <h2 className={styles.panelTitle}>Client Directory</h2>
          <p className={styles.clientSectionSubtitle}>
            Manage buyer accounts, contact profiles, and outstanding balances.
          </p>
        </div>
        <div className={styles.clientActions}>
          <div className={styles.clientSearchBar}>
            <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.clientSearchInput}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className={styles.clientAddBtn}
          >
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className={styles.clientGrid} style={{ marginTop: "24px" }}>
        {filteredClients.map((client) => (
          <div 
            key={client.id} 
            className={styles.clientCard} 
            style={{ height: "100%", cursor: "pointer" }}
            onClick={() => router.push(`/clients/${client.id}`)}
          >
            <div className={styles.clientCardTop}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div
                  className={styles.clientCompanyName}
                  style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)", fontWeight: 700 }}
                >
                  {client.companyName}
                  <ExternalLink size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </div>
                {client.address && <span className={styles.clientContactName}>{client.address}</span>}
              </div>


            </div>

            <div style={{ marginTop: "auto", paddingTop: "20px" }}>
              <div className={styles.clientCardBottom} style={{ flexDirection: "column", alignItems: "stretch", gap: "16px", padding: "16px" }}>
                <div className={styles.clientBalanceGroup}>
                  <span className={styles.clientBalanceLabel}>Balance Due</span>
                  <span
                    className={styles.cardBalanceValue}
                    style={{ color: client.balanceAmount > 0 ? "var(--warning)" : "var(--text-secondary)" }}
                  >
                    {formatCurrency(client.balanceAmount)}
                  </span>
                </div>
                
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <button
                    className={statementsStyles.btnDownload}
                    style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(client);
                    }}
                    disabled={loadingId === client.id}
                  >
                    <Download size={14} />
                    <span className={styles.hideOnMobile}>{loadingId === client.id ? "PDF..." : "Download"}</span>
                  </button>
                  <button
                    className={statementsStyles.btnShare}
                    style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(client);
                    }}
                    disabled={sharingId === client.id}
                  >
                    <Share2 size={14} />
                    <span className={styles.hideOnMobile}>{sharingId === client.id ? "Share..." : "Share"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className={styles.clientEmptyState} style={{ gridColumn: "1 / -1" }}>
            <Search size={48} style={{ margin: "0 auto 16px", color: "var(--border-hover)" }} />
            <h3>No clients found</h3>
            <p style={{ fontSize: "14px", marginTop: "8px" }}>
              Try adjusting your search criteria or register a new buyer profile.
            </p>
          </div>
        )}
      </div>



      {/* Add Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          reset();
          setIsModalOpen(false);
        }}
        title="Add New Client Profile"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.clientForm}>
          <div className={styles.clientInputGroup}>
            <label className={styles.clientLabel}>Company Name</label>
            <input
              {...register("companyName")}
              placeholder="e.g. SteelCraft Corp"
              className={styles.clientInput}
              disabled={isPending}
            />
            {errors.companyName && <span className={styles.clientError}>{errors.companyName.message}</span>}
          </div>

          <div className={styles.clientInputGroup}>
            <label className={styles.clientLabel}>Phone Number <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("phone")}
              placeholder="e.g. +91 98765 43210"
              className={styles.clientInput}
              disabled={isPending}
            />
          </div>

          <div className={`${styles.clientInputGroup} ${styles.clientFullWidth}`}>
            <label className={styles.clientLabel}>Location <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("address")}
              placeholder="e.g. Plot 42, GIDC Industrial Estate"
              className={styles.clientInput}
              disabled={isPending}
            />
          </div>

          <div className={styles.clientFullWidth} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => {
                reset();
                setIsModalOpen(false);
              }}
              className={styles.clientBtnSecondary}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.clientAddBtn}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader size={16} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Register Client</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
