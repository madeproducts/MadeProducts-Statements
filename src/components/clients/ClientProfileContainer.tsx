"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  Plus,
  Edit,
  Trash2,
  FileText,
  IndianRupee,
  Calendar,
  MessageSquare,
  Download,
  AlertCircle,
  Clock,
  Loader,
} from "lucide-react";
import { useToast } from "../ui/Toast";
import Modal from "../ui/Modal";
import FileUpload from "../ui/FileUpload";
import { updateClientAction, deleteClientAction } from "@/app/actions/clients";
import { clientFormSchema } from "@/lib/schemas";
import { createStatementAction, deleteStatementAction } from "@/app/actions/statements";
import { addPaymentAction, deletePaymentAction } from "@/app/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateClientStatementPDF } from "@/lib/pdf";
import styles from "@/app/(authenticated)/clients/profile.module.css";
import formStyles from "@/app/(authenticated)/clients/clients.module.css";
import tableStyles from "@/app/(authenticated)/dashboard/dashboard.module.css";

// Inline schemas with string-based number inputs (coerced manually)
const statementFormSchema = z.object({
  invoiceNumber: z.string().min(2, "Invoice number must be at least 2 characters"),
  productDetails: z.string().min(5, "Product details must be at least 5 characters"),
  quantity: z.string().min(1, "Quantity required").transform((v) => parseInt(v, 10)),
  billAmount: z.string().min(1, "Total amount required").transform((v) => parseFloat(v)),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  notes: z.string().optional(),
});

const paymentFormSchema = z.object({
  receivedAmount: z.string().min(1, "Amount required").transform((v) => parseFloat(v)),
  date: z.string().min(1, "Payment date required"),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE", "CASH"]),
});

interface PaymentClientModel {
  id: string;
  clientId: string;
  receivedAmount: number;
  date: string;
  paymentMethod: string;
  referenceNumber: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface StatementClientModel {
  id: string;
  clientId: string;
  invoiceNumber: string | null;
  productDetails: string | null;
  quantity: number;
  billAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  status: string;
  date: string;
  notes: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

interface ClientProfileContainerProps {
  client: {
    id: string;
    name: string | null;
    companyName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    createdAt: string;
    payments: PaymentClientModel[];
  };
  statements: StatementClientModel[];
  currentUserRole: string;
}

export default function ClientProfileContainer({
  client,
  statements,
  currentUserRole,
 }: ClientProfileContainerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeModal, setActiveModal] = useState<
    "edit-client" | "delete-client" | "new-statement" | "add-payment" | "delete-statement" | "delete-payment" | null
  >(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [uploadedInvoiceUrl, setUploadedInvoiceUrl] = useState("");
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState("");

  const isAdmin = currentUserRole === "ADMIN";

  // --- EDIT CLIENT FORM ---
  const editClientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema) as any,
    defaultValues: {
      name: client.name || "",
      companyName: client.companyName,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      country: client.country || "",
    },
  });

  const onEditClientSubmit = async (data: z.infer<typeof clientFormSchema>) => {
    startTransition(async () => {
      const res = await updateClientAction(client.id, data);
      if (res.success) {
        showToast("Client profile updated successfully.", "success");
        setActiveModal(null);
        router.refresh();
      } else {
        showToast(res.error || "Failed to update profile.", "error");
      }
    });
  };

  // --- NEW STATEMENT FORM ---
  const newStatementForm = useForm({
    defaultValues: {
      invoiceNumber: "",
      billAmount: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const onNewStatementSubmit = async (rawData: any) => {
    const parsed = {
      clientId: client.id,
      invoiceNumber: rawData.invoiceNumber || "",
      billAmount: parseFloat(rawData.billAmount),
      date: rawData.date,
    };
    startTransition(async () => {
      const res = await createStatementAction(parsed);
      if (res.success) {
        showToast("Bill added successfully.", "success");
        newStatementForm.reset({
          invoiceNumber: "",
          billAmount: "",
          date: new Date().toISOString().split("T")[0],
        });
        setActiveModal(null);
        router.refresh();
      } else {
        showToast(res.error || "Failed to create bill.", "error");
      }
    });
  };

  // --- ADD PAYMENT FORM ---
  const addPaymentForm = useForm({
    defaultValues: {
      receivedAmount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
    },
  });

  const onAddPaymentSubmit = async (rawData: any) => {
    const validated = paymentFormSchema.safeParse(rawData);
    if (!validated.success) {
      showToast(validated.error.issues[0].message, "error");
      return;
    }
    startTransition(async () => {
      const res = await addPaymentAction({
        clientId: client.id,
        receivedAmount: validated.data.receivedAmount,
        date: validated.data.date,
        paymentMethod: validated.data.paymentMethod,
        referenceNumber: undefined,
        receiptUrl: "",
        notes: undefined,
      });
      if (res.success) {
        showToast("Payment recorded in ledger.", "success");
        addPaymentForm.reset();
        setActiveModal(null);
        router.refresh();
      } else {
        showToast(res.error || "Failed to log payment.", "error");
      }
    });
  };

  // --- DELETE ACTIONS ---
  const handleDeleteClient = () => {
    startTransition(async () => {
      const res = await deleteClientAction(client.id);
      if (res.success) {
        showToast("Client deleted.", "success");
        setActiveModal(null);
        router.push("/clients");
      } else {
        showToast(res.error || "Failed to delete client.", "error");
      }
    });
  };

  const handleDeleteStatement = () => {
    if (!selectedStatementId) return;
    startTransition(async () => {
      const res = await deleteStatementAction(selectedStatementId);
      if (res.success) {
        showToast("Statement deleted.", "success");
        setSelectedStatementId(null);
        setActiveModal(null);
        router.refresh();
      } else {
        showToast(res.error || "Failed to delete statement.", "error");
      }
    });
  };

  const handleDeletePayment = () => {
    if (!selectedPaymentId) return;
    startTransition(async () => {
      const res = await deletePaymentAction(selectedPaymentId);
      if (res.success) {
        showToast("Payment record removed.", "success");
        setSelectedPaymentId(null);
        setActiveModal(null);
        router.refresh();
      } else {
        showToast(res.error || "Failed to delete payment.", "error");
      }
    });
  };

  // --- PDF & WHATSAPP ---
  const handleDownloadPDF = async () => {
    const doc = await generateClientStatementPDF(client, statements, pendingBalance);
    doc.save(`${client.companyName.replace(/\s+/g, '_')}_Statement.pdf`);
    showToast("Statement PDF downloaded", "success");
  };

  const handleWhatsAppPDF = async () => {
    const doc = await generateClientStatementPDF(client, statements, pendingBalance);
    const fileName = `${client.companyName.replace(/\s+/g, '_')}_Statement.pdf`;

    if (navigator.share && navigator.canShare) {
      try {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Client Statement',
            text: `Please find the attached statement for ${client.companyName}.`,
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.error("Error sharing PDF:", err);
      }
    }

    // Fallback: Download and redirect to WhatsApp
    doc.save(fileName);
    let phone = (client.phone || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    const msg = `Hello ${client.name || "Customer"}. Please find your account statement attached. Current outstanding balance is ${formatCurrency(pendingBalance)}. (Note: Please attach the downloaded PDF manually)`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const totalBilled = statements.reduce((s, r) => s + r.billAmount, 0);
  const totalPaid = client.payments.reduce((s, r) => s + r.receivedAmount, 0);
  const pendingBalance = totalBilled - totalPaid;

  const allPayments = [...client.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Unified ledger entries for Statement (Normal Statement) view
  const ledgerEntries = [
    ...statements.map((stmt) => ({
      id: stmt.id,
      type: "BILL" as const,
      date: new Date(stmt.date),
      reference: stmt.invoiceNumber,
      description: "Bill",
      productDetails: stmt.productDetails,
      quantity: stmt.quantity,
      billAmount: stmt.billAmount,
      receivedAmount: null,
      balanceAmount: stmt.balanceAmount,
      invoiceUrl: stmt.invoiceUrl,
      status: stmt.status,
      original: stmt,
    })),
    ...client.payments.map((pay) => ({
        id: pay.id,
        type: "PAYMENT" as const,
        date: new Date(pay.date),
        reference: pay.referenceNumber,
        description: `Payment Received (${pay.paymentMethod.replace("_", " ")})`,
        productDetails: pay.notes,
        quantity: null,
        billAmount: null,
        receivedAmount: pay.receivedAmount,
        receiptUrl: pay.receiptUrl,
        clientId: pay.clientId,
        original: pay,
      }))
  ].sort((a, b) => {
    const timeDiff = a.date.getTime() - b.date.getTime();
    if (timeDiff !== 0) return timeDiff;
    // Same date: Bills appear before Payments
    if (a.type === "BILL" && b.type === "PAYMENT") return -1;
    if (a.type === "PAYMENT" && b.type === "BILL") return 1;
    // If same type, fallback to createdAt if available, otherwise 0
    const aCreated = new Date(a.original.createdAt || 0).getTime();
    const bCreated = new Date(b.original.createdAt || 0).getTime();
    return aCreated - bCreated;
  });

  return (
    <div>
      {/* Header */}
      <header className={styles.profileHeader}>
        <div className={styles.clientMeta}>
          <h1 
            className={styles.clientTitle} 
            onClick={() => setIsDetailsVisible(!isDetailsVisible)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
            title="Click to toggle corporate details"
          >
            {client.companyName}
          </h1>
          <p className={styles.clientSubtitle}>Contact Representative: {client.name}</p>
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={handleDownloadPDF} className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
            <Download size={16} /><span>Download PDF</span>
          </button>
          <button onClick={handleWhatsAppPDF} className={`${formStyles.button}`} style={{ backgroundColor: "#25D366", color: "white" }}>
            <MessageSquare size={16} /><span>Share</span>
          </button>
          {isAdmin && (
            <button onClick={() => setActiveModal("delete-client")} className={`${formStyles.button} ${formStyles.buttonDanger}`}>
              <Trash2 size={16} /><span>Delete Client</span>
            </button>
          )}
        </div>
      </header>

      {/* Two Column Layout */}
      <div className={styles.profileGrid}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Balance card */}
          <div className={styles.balanceOverview}>
            <div>
              <span className={formStyles.balanceLabel}>Total Outstanding</span>
              <div className={styles.balanceNumber}>{formatCurrency(pendingBalance)}</div>
            </div>
            <IndianRupee size={36} style={{ color: "var(--primary)", opacity: 0.8 }} />
          </div>

          {/* Contact info */}
          {isDetailsVisible && (
            <div 
              className={styles.infoCard}
              onClick={() => setActiveModal("edit-client")}
              style={{ cursor: "pointer" }}
              title="Click to edit corporate details"
            >
              <h2 className={styles.cardTitle}>
                <User size={18} />
                <span>Corporate Details</span>
                <Edit size={14} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
              </h2>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Email</span><span className={styles.detailValue}>{client.email}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Phone</span><span className={styles.detailValue}>{client.phone}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Address</span><span className={styles.detailValue}>{client.address}, {client.city}, {client.country}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Since</span><span className={styles.detailValue}>{formatDate(client.createdAt)}</span></div>
            </div>
          )}
        </div>

        {/* Right Column — Statements */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.cardTitle}><FileText size={18} /><span>Statement</span></h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    addPaymentForm.reset({
                      receivedAmount: "",
                      date: new Date().toISOString().split("T")[0],
                      paymentMethod: "CASH",
                    });
                    setActiveModal("add-payment");
                  }}
                  className={`${formStyles.button} ${formStyles.buttonSecondary}`}
                >
                  <IndianRupee size={16} /><span>Pay</span>
                </button>
                <button onClick={() => setActiveModal("new-statement")} className={`${formStyles.button} ${formStyles.buttonPrimary}`}>
                  <Plus size={16} /><span>Add Bill</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Bill Amount</th>
                    <th style={{ textAlign: "right" }}>Received Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: "13px" }}>{formatDate(entry.date)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {entry.type === "BILL" ? (
                            `Bill ${entry.reference ? `#${entry.reference}` : ""}`
                          ) : (
                            entry.description
                          )}
                        </div>
                        {entry.type === "BILL" && entry.productDetails && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.productDetails} {entry.quantity ? `(Qty: ${entry.quantity})` : ""}
                          </div>
                        )}
                        {entry.type === "PAYMENT" && entry.reference && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            Ref: {entry.reference}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {entry.billAmount !== null ? formatCurrency(entry.billAmount) : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--success)" }}>
                        {entry.receivedAmount !== null ? formatCurrency(entry.receivedAmount) : "—"}
                      </td>
                    </tr>
                  ))}
                  {ledgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                        No statement entries yet. Click &ldquo;Add Bill&rdquo; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment log at the bottom */}
      <div className={styles.infoCard} style={{ marginTop: "24px" }}>
        <h2 className={styles.cardTitle}><Clock size={18} /><span>Payment Log</span></h2>
        <div className={styles.paymentList}>
          {allPayments.map((pay) => (
            <div key={pay.id} className={styles.paymentItem}>
              <div className={styles.paymentMeta}>
                <span className={styles.paymentTitle}>{formatCurrency(pay.receivedAmount)}</span>
                <span className={styles.paymentDetails}>#{pay.invoiceNumber} · {pay.paymentMethod.replace("_", " ")}</span>
                <span className={styles.paymentDetails}>{formatDate(pay.date)}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {pay.receiptUrl && (
                  <a href={pay.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--success)" }} title="View Receipt">
                    <Download size={14} />
                  </a>
                )}
                {isAdmin && (
                  <button onClick={() => { setSelectedPaymentId(pay.id); setActiveModal("delete-payment"); }} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {allPayments.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0", fontSize: "13px" }}>No payment records found.</div>
          )}
        </div>
      </div>

      {/* MODAL: Edit Client */}
      <Modal isOpen={activeModal === "edit-client"} onClose={() => setActiveModal(null)} title="Edit Client Information" size="md">
        <form onSubmit={editClientForm.handleSubmit(onEditClientSubmit as any)} className={formStyles.form}>
          {([
            ["companyName", "Company Name", "text"],
            ["name", "Contact Name", "text"],
            ["email", "Email Address", "email"],
            ["phone", "Phone Number", "text"],
          ] as const).map(([field, label, type]) => (
            <div key={field} className={formStyles.inputGroup}>
              <label className={formStyles.label}>{label}</label>
              <input {...editClientForm.register(field)} type={type} className={formStyles.input} disabled={isPending} />
              {editClientForm.formState.errors[field] && <span className={formStyles.error}>{editClientForm.formState.errors[field]?.message as string}</span>}
            </div>
          ))}

          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Address</label>
            <input {...editClientForm.register("address")} className={formStyles.input} disabled={isPending} />
            {editClientForm.formState.errors.address && <span className={formStyles.error}>{editClientForm.formState.errors.address.message}</span>}
          </div>
          <div className={formStyles.inputGroup}>
            <label className={formStyles.label}>City</label>
            <input {...editClientForm.register("city")} className={formStyles.input} disabled={isPending} />
          </div>
          <div className={formStyles.inputGroup}>
            <label className={formStyles.label}>Country</label>
            <input {...editClientForm.register("country")} className={formStyles.input} disabled={isPending} />
          </div>
          <div className={formStyles.fullWidth} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setActiveModal(null)} className={`${formStyles.button} ${formStyles.buttonSecondary}`} disabled={isPending}>Cancel</button>
            <button type="submit" className={`${formStyles.button} ${formStyles.buttonPrimary}`} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Delete Client */}
      <Modal isOpen={activeModal === "delete-client"} onClose={() => setActiveModal(null)} title="Confirm Client Deletion" size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", color: "var(--danger)", padding: "12px", backgroundColor: "var(--danger-light)", borderRadius: "var(--radius-sm)" }}>
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: "14px", fontWeight: 500 }}>WARNING: This action is permanent and will delete the client and all associated data.</p>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Delete <strong>{client.companyName}</strong>?</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setActiveModal(null)} className={`${formStyles.button} ${formStyles.buttonSecondary}`} disabled={isPending}>Cancel</button>
            <button type="button" onClick={handleDeleteClient} style={{ backgroundColor: "var(--danger)", color: "white", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: New Statement */}
      <Modal isOpen={activeModal === "new-statement"} onClose={() => { newStatementForm.reset(); setActiveModal(null); }} title="Add Bill" size="sm">
        <form onSubmit={newStatementForm.handleSubmit(onNewStatementSubmit)} className={formStyles.form}>
          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Date</label>
            <input {...newStatementForm.register("date")} type="date" className={formStyles.input} disabled={isPending} />
          </div>
          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Bill No <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.8rem'}}>(optional)</span></label>
            <input {...newStatementForm.register("invoiceNumber")} placeholder="e.g. INV-001" className={formStyles.input} disabled={isPending} />
          </div>
          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Bill Amount (₹)</label>
            <input {...newStatementForm.register("billAmount")} type="number" step="0.01" min="0" placeholder="e.g. 50000" className={formStyles.input} disabled={isPending} />
          </div>
          <div className={formStyles.fullWidth} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => { newStatementForm.reset(); setActiveModal(null); }} className={`${formStyles.button} ${formStyles.buttonSecondary}`} disabled={isPending}>Cancel</button>
            <button type="submit" className={`${formStyles.button} ${formStyles.buttonPrimary}`} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Add Bill"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Payment */}
      <Modal
        isOpen={activeModal === "add-payment"}
        onClose={() => { addPaymentForm.reset(); setActiveModal(null); }}
        title="Record Payment"
        size="sm"
      >
        <form onSubmit={addPaymentForm.handleSubmit(onAddPaymentSubmit)} className={formStyles.form}>

          {/* Balance info strip */}
          <div style={{ padding: "10px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px", border: "1px solid var(--border-color)", gridColumn: "1 / -1" }}>
            Total Outstanding Balance: <strong style={{ color: "var(--warning)" }}>{formatCurrency(pendingBalance)}</strong>
          </div>

          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Payment Date</label>
            <input {...addPaymentForm.register("date")} type="date" className={formStyles.input} disabled={isPending} />
          </div>

          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Payment Mode</label>
            <select {...addPaymentForm.register("paymentMethod")} className={formStyles.input} disabled={isPending}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className={`${formStyles.inputGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Amount Received (₹)</label>
            <input
              {...addPaymentForm.register("receivedAmount")}
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 25000"
              className={formStyles.input}
              disabled={isPending}
            />
          </div>

          <div className={formStyles.fullWidth} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => { addPaymentForm.reset(); setActiveModal(null); }}
              className={`${formStyles.button} ${formStyles.buttonSecondary}`}
              disabled={isPending}
            >
              Cancel
            </button>
            <button type="submit" className={`${formStyles.button} ${formStyles.buttonPrimary}`} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Delete Statement */}
      <Modal isOpen={activeModal === "delete-statement"} onClose={() => setActiveModal(null)} title="Delete Statement" size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Delete this statement? All linked payment records will also be removed.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setActiveModal(null)} className={`${formStyles.button} ${formStyles.buttonSecondary}`} disabled={isPending}>Cancel</button>
            <button type="button" onClick={handleDeleteStatement} style={{ backgroundColor: "var(--danger)", color: "white", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Delete Payment */}
      <Modal isOpen={activeModal === "delete-payment"} onClose={() => setActiveModal(null)} title="Remove Payment Record" size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Delete this payment record? The statement balance will be updated automatically.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setActiveModal(null)} className={`${formStyles.button} ${formStyles.buttonSecondary}`} disabled={isPending}>Cancel</button>
            <button type="button" onClick={handleDeletePayment} style={{ backgroundColor: "var(--danger)", color: "white", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} disabled={isPending}>
              {isPending ? <Loader className="spinner" size={16} /> : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
