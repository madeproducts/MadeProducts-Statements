import React from "react";
import { Loader } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div style={{
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "calc(100vh - 120px)",
      flexDirection: "column",
      gap: "16px",
      color: "var(--text-muted)"
    }}>
      <Loader size={48} className="spinner" style={{ color: "var(--primary)" }} />
      <p style={{ fontSize: "14px", fontWeight: 500 }}>Loading Dashboard Data...</p>
    </div>
  );
}
