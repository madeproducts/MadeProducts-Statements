import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import styles from "./layout.module.css";
import { Database, HelpCircle } from "lucide-react";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let currentUser = null;
  let setupRequired = false;
  let dbErrorMessage = "";

  const isEnvUnconfigured =
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL.includes("[YOUR-PROJECT-REF]") ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("[YOUR-PROJECT-REF]");

  if (isEnvUnconfigured) {
    setupRequired = true;
  } else {
    try {
      currentUser = await getCurrentUser();
    } catch (error: any) {
      setupRequired = true;
      dbErrorMessage = error.message || "Could not connect to database.";
    }
  }

  if (setupRequired) {
    return (
      <div className={styles.setupContainer}>
        <div className={styles.setupCard}>
          <div className={styles.setupHeader}>
            <Database size={32} style={{ color: "var(--warning)" }} />
            <h1 className={styles.setupTitle}>Database Setup Required</h1>
          </div>

          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            To run the <strong>Made Products Client Statement Tracker</strong>, you need to connect your local environment to a Supabase PostgreSQL database. Please follow these simple setup instructions:
          </p>

          <div className={styles.setupStep}>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>1</span>
              <span>Create Supabase Project</span>
            </div>
            <div className={styles.stepContent}>
              Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>supabase.com</a>, create a free project, and navigate to <strong>Project Settings &gt; Database</strong>.
            </div>
          </div>

          <div className={styles.setupStep}>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>2</span>
              <span>Configure Environment Variables</span>
            </div>
            <div className={styles.stepContent}>
              Create a file named <code className={styles.codeBlock} style={{ display: "inline-block", padding: "2px 6px", margin: 0 }}>.env</code> in the project root directory and copy the contents from <code className={styles.codeBlock} style={{ display: "inline-block", padding: "2px 6px", margin: 0 }}>.env.example</code>, replacing placeholders with your Supabase credentials:
              <div className={styles.codeBlock}>
{`DATABASE_URL="postgresql://postgres.[REF]:[PW]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[REF]:[PW]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"`}
              </div>
            </div>
          </div>

          <div className={styles.setupStep}>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>3</span>
              <span>Run Database Migrations & Seeding</span>
            </div>
            <div className={styles.stepContent}>
              Open your terminal, navigate to this project folder, and execute the following commands to initialize the schema and populate mock billing records:
              <div className={styles.codeBlock}>
{`# 1. Run migrations to create database tables
npx prisma db push

# 2. Seed database with test clients, statements, and payments
npx prisma db seed`}
              </div>
            </div>
          </div>

          {dbErrorMessage && (
            <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-light)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "13px" }}>
              <strong>Error Info:</strong> {dbErrorMessage}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <HelpCircle size={14} /> Need help? Check the README.md file in the root.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Double check session
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className={styles.shell}>
        <Sidebar user={currentUser} />
        <main className={styles.mainPanel}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
