"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, Menu, X, ShieldAlert, Home } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { useToast } from "../ui/Toast";
import styles from "./Sidebar.module.css";
import InstallPWA from "../ui/InstallPWA";

interface SidebarProps {
  user: {
    email: string;
    name: string | null;
    role: string;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/home", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Statements", href: "/statements", icon: FileText },
  ];

  const handleLogout = async () => {
    const res = await logoutAction();
    if (res.success) {
      showToast("Logged out successfully.", "success");
      router.push("/login");
      router.refresh();
    } else {
      showToast(res.error || "Logout failed.", "error");
    }
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <span className={styles.logoText}>MADE PRODUCTS</span>
        <button onClick={toggleSidebar} className={styles.hamburger}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.topSection}>
          <div className={styles.brand}>
            <div className={styles.logoSymbol}>
              <img src="/logo.png" alt="Made Products Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div className={styles.logoTextGroup}>
              <span className={styles.logoTitle}>MADE PRODUCTS</span>
              <span className={styles.logoSubtitle}>Financial Ledger</span>
            </div>
          </div>

          <nav className={styles.nav}>
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={20} className={styles.navIcon} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <InstallPWA />
          </nav>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className={styles.footerSection}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div className={styles.userDetails}>
                <p className={styles.userName}>{user.name || "User"}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <p className={styles.userRole}>{user.role}</p>
                  {user.role === "ADMIN" && (
                    <ShieldAlert size={12} style={{ color: "var(--warning)" }} />
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
            <div style={{ marginTop: "16px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)" }}>
              Built by <a href="https://github.com/abhinhere" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>abhinmadewebs</a>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className={styles.overlay} onClick={toggleSidebar} />}
    </>
  );
}
