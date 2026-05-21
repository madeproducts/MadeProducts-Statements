"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
}

interface DistributionData {
  name: string;
  value: number;
}

export function MonthlyRevenueChart({ data }: { data: MonthlyData[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        Loading Chart Data...
      </div>
    );
  }

  // Fallback for empty data
  if (data.length === 0) {
    return (
      <div
        style={{
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value >= 100000 ? `${(value / 100000).toFixed(1)}L` : value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-family)",
              fontSize: "13px",
              boxShadow: "var(--shadow-md)",
            }}
            formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueDistributionChart({ data }: { data: DistributionData[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height: "300px" }} />;
  }

  const COLORS = ["var(--success)", "var(--danger)"];

  return (
    <div style={{ width: "100%", height: 300, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
              formatter={(value: any) => `₹${Number(value).toLocaleString("en-IN")}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        {data.map((entry, index) => (
          <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                backgroundColor: COLORS[index % COLORS.length],
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              {entry.name}: <strong>₹{entry.value.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
