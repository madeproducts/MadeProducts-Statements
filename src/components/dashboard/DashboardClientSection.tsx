"use client";

import React, { useState, useTransition } from "react";
import { Search, Plus, Mail, Phone, MapPin, ExternalLink, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useToast } from "../ui/Toast";
import Modal from "../ui/Modal";
import { createClientAction } from "@/app/actions/clients";
import { clientFormSchema } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import styles from "@/app/(authenticated)/dashboard/dashboard.module.css";

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
  createdAt: Date;
  statements: {
    balanceAmount: any;
  }[];
}

interface DashboardClientSectionProps {
  initialClients: ClientWithStatements[];
  currentUserRole: string;
}

export default function DashboardClientSection({
  initialClients,
  currentUserRole,
}: DashboardClientSectionProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "India",
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
    return client.statements.reduce((sum, s) => sum + Number(s.balanceAmount), 0);
  };

  const filteredClients = initialClients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
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
      <div className={styles.clientGrid}>
        {filteredClients.map((client) => {
          const balance = getClientBalance(client);
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className={styles.clientCard}
            >
              <div className={styles.clientCardTop}>
                <h3 className={styles.clientCompanyName}>{client.companyName}</h3>
                <span className={styles.clientContactName}>{client.name}</span>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                  {client.email && (
                    <div className={styles.clientInfoRow}>
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className={styles.clientInfoRow}>
                      <Phone size={14} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.city || client.country) && (
                    <div className={styles.clientInfoRow}>
                      <MapPin size={14} />
                      <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className={styles.clientCardDivider} />
                <div className={styles.clientCardBottom}>
                  <div className={styles.clientBalanceGroup}>
                    <span className={styles.clientBalanceLabel}>Balance Due</span>
                    <span
                      className={styles.clientBalanceVal}
                      style={{ color: balance > 0 ? "var(--warning)" : "var(--success)" }}
                    >
                      {formatCurrency(balance)}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    View Profile <ExternalLink size={13} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className={styles.clientEmptyState}>
          <Search size={48} style={{ margin: "0 auto 16px", color: "var(--border-hover)" }} />
          <h3>No clients found</h3>
          <p style={{ fontSize: "14px", marginTop: "8px" }}>
            Try adjusting your search criteria or register a new buyer profile.
          </p>
        </div>
      )}

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
            <label className={styles.clientLabel}>Contact Name <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("name")}
              placeholder="e.g. Rajesh Sharma"
              className={styles.clientInput}
              disabled={isPending}
            />
          </div>

          <div className={styles.clientInputGroup}>
            <label className={styles.clientLabel}>Email Address <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("email")}
              type="email"
              placeholder="e.g. billing@steelcraft.in"
              className={styles.clientInput}
              disabled={isPending}
            />
            {errors.email && <span className={styles.clientError}>{errors.email.message}</span>}
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
            <label className={styles.clientLabel}>Address <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("address")}
              placeholder="e.g. Plot 42, GIDC Industrial Estate"
              className={styles.clientInput}
              disabled={isPending}
            />
          </div>

          <div className={styles.clientInputGroup}>
            <label className={styles.clientLabel}>City</label>
            <input
              {...register("city")}
              placeholder="e.g. Ahmedabad"
              className={styles.clientInput}
              disabled={isPending}
            />
            {errors.city && <span className={styles.clientError}>{errors.city.message}</span>}
          </div>

          <div className={styles.clientInputGroup}>
            <label className={styles.clientLabel}>Country</label>
            <input
              {...register("country")}
              placeholder="e.g. India"
              className={styles.clientInput}
              disabled={isPending}
            />
            {errors.country && <span className={styles.clientError}>{errors.country.message}</span>}
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
