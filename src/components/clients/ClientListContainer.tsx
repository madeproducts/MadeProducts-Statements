"use client";

import React, { useState, useTransition } from "react";
import { Search, Plus, Mail, Phone, MapPin, ExternalLink, Hash, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useToast } from "../ui/Toast";
import Modal from "../ui/Modal";
import { createClientAction } from "@/app/actions/clients";
import { clientFormSchema } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import styles from "@/app/(authenticated)/clients/clients.module.css";

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
    balanceAmount: any; // Decimal
  }[];
}

interface ClientListContainerProps {
  initialClients: ClientWithStatements[];
  currentUserRole: string;
}

export default function ClientListContainer({
  initialClients,
  currentUserRole,
}: ClientListContainerProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // React Hook Form
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

  // 1. Calculate balance helper
  const getClientBalance = (client: ClientWithStatements) => {
    return client.statements.reduce((sum, s) => sum + Number(s.balanceAmount), 0);
  };

  // 2. Filter clients
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
    <div>
      <header className={styles.headerSection}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Client Directory</h1>
          <p className={styles.subtitle}>
            Manage buyer accounts, contact profiles, and outstanding balances.
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.searchBar}>
            <Search size={18} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search clients, companies, cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>


          <button
            onClick={() => setIsModalOpen(true)}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        </div>
      </header>

      {/* Grid of Clients */}
      <div className={styles.grid}>
        {filteredClients.map((client) => {
          const balance = getClientBalance(client);
          return (
            <Link key={client.id} href={`/clients/${client.id}`} className={styles.card} style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div className={styles.cardTop}>
                <h3 className={styles.companyName}>{client.companyName}</h3>
                <span className={styles.contactName}>{client.name}</span>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                  {client.email && <div className={styles.infoRow}>
                    <Mail size={14} />
                    <span>{client.email}</span>
                  </div>}
                  {client.phone && <div className={styles.infoRow}>
                    <Phone size={14} />
                    <span>{client.phone}</span>
                  </div>}
                  {(client.city || client.country) && <div className={styles.infoRow}>
                    <MapPin size={14} />
                    <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
                  </div>}
                </div>
              </div>

              <div>
                <div className={styles.cardDivider} />
                <div className={styles.cardBottom}>
                  <div className={styles.balanceGroup}>
                    <span className={styles.balanceLabel}>Balance Due</span>
                    <span
                      className={styles.balanceVal}
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
        <div
          style={{
            textAlign: "center",
            padding: "80px var(--spacing-lg)",
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-muted)",
          }}
        >
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
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Company Name</label>
            <input
              {...register("companyName")}
              placeholder="e.g. SteelCraft Corp"
              className={styles.input}
              disabled={isPending}
            />
            {errors.companyName && <span className={styles.error}>{errors.companyName.message}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Contact Name <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("name")}
              placeholder="e.g. Rajesh Sharma"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("email")}
              type="email"
              placeholder="e.g. billing@steelcraft.in"
              className={styles.input}
              disabled={isPending}
            />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Phone Number <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("phone")}
              placeholder="e.g. +91 98765 43210"
              className={styles.input}
              disabled={isPending}
            />
          </div>



          <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Address <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input
              {...register("address")}
              placeholder="e.g. Plot 42, GIDC Industrial Estate"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>City</label>
            <input
              {...register("city")}
              placeholder="e.g. Ahmedabad"
              className={styles.input}
              disabled={isPending}
            />
            {errors.city && <span className={styles.error}>{errors.city.message}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Country</label>
            <input
              {...register("country")}
              placeholder="e.g. India"
              className={styles.input}
              disabled={isPending}
            />
            {errors.country && <span className={styles.error}>{errors.country.message}</span>}
          </div>

          <div className={`${styles.fullWidth}`} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => {
                reset();
                setIsModalOpen(false);
              }}
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
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
