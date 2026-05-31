"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CompanySignal } from "@/types/signals";

type SignalChartProps = {
  signals: CompanySignal[];
  mode: "health" | "roles";
};

export function SignalChart({ signals, mode }: SignalChartProps) {
  const data = signals.map((signal) => ({
    date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
      new Date(signal.createdAt)
    ),
    healthScore: signal.healthScore,
    openRoles: signal.openRoles,
    engineeringRoles: signal.engineeringRoles,
    enterprisePrice: signal.enterprisePrice ?? 0
  }));

  if (mode === "roles") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#ded8cc" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#6b655b", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#6b655b", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 6, borderColor: "#ded8cc", background: "#fffdf8" }}
            labelStyle={{ color: "#11110f" }}
          />
          <Line
            type="monotone"
            dataKey="openRoles"
            name="Open roles"
            stroke="#34785a"
            strokeWidth={3}
            dot={{ r: 4, fill: "#34785a" }}
          />
          <Line
            type="monotone"
            dataKey="engineeringRoles"
            name="Engineering/technical roles"
            stroke="#245c9e"
            strokeWidth={3}
            dot={{ r: 4, fill: "#245c9e" }}
          />
          <Line
            type="monotone"
            dataKey="enterprisePrice"
            name="Enterprise price"
            stroke="#b7791f"
            strokeWidth={3}
            dot={{ r: 4, fill: "#b7791f" }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 12, right: 18, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id="healthFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#34785a" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#34785a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ded8cc" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#6b655b", fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#6b655b", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 6, borderColor: "#ded8cc", background: "#fffdf8" }}
          labelStyle={{ color: "#11110f" }}
        />
        <Area
          type="monotone"
          dataKey="healthScore"
          name="Health score"
          stroke="#34785a"
          strokeWidth={3}
          fill="url(#healthFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
