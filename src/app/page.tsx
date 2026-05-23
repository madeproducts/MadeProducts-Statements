import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/home");
  } else {
    redirect("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div className="spinner" />
      <p style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>
        Loading Made Products Ledger...
      </p>
    </div>
  );
}
