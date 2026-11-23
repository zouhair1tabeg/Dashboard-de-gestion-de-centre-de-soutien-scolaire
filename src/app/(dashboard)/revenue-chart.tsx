"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDH } from "@/lib/format";

interface RevenueChartProps {
  revenues: { month: string; label: string; amount: number }[];
  currentMonth: string;
}

/** Graphique des revenus : le mois sélectionné est en vert foncé. */
export function RevenueChart({ revenues, currentMonth }: RevenueChartProps) {
  if (revenues.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Aucune donnée disponible
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={revenues} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickFormatter={(value: number) => formatDH(value)}
            width={82}
          />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            formatter={(value) => [formatDH(Number(value)), "Encaissé"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            {revenues.map((revenue) => (
              <Cell
                key={revenue.month}
                fill={revenue.month === currentMonth ? "#047857" : "#86efac"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
