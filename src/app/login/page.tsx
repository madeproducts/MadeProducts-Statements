"use client";

import React, { useActionState, useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "../actions/auth";
import { useToast } from "@/components/ui/Toast";
import { Eye, EyeOff } from "lucide-react";
import styles from "./login.module.css";

const initialState = {
  success: false,
  error: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      let result;
      await new Promise<void>((resolve) => {
        startTransition(async () => {
          result = await loginAction(prevState, formData);
          resolve();
        });
      });
      return result || prevState;
    },
    initialState
  );

  useEffect(() => {
    if (state.success) {
      showToast("Logged in successfully!", "success");
      window.location.href = "/home";
    } else if (state.error) {
      showToast(state.error, "error");
    }
  }, [state, showToast]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/logo.png" alt="Made Products Logo" className={styles.logoImage} />
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Enter your credentials to access the manufacturing ledger
          </p>
        </div>

        {state.error && <div className={styles.errorBox}>{state.error}</div>}

        <form action={formAction} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@madeproducts.com"
              required
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className={styles.input}
                style={{ paddingRight: "40px" }}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={isPending}>
            {isPending ? "Logging in..." : "Log In"}
          </button>
        </form>


      </div>
    </div>
  );
}
