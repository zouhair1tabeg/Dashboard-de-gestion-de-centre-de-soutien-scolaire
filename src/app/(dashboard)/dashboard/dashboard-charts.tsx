"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type RevenueData = {
  month: string;
  amount: number;
};

type FillRateData = {
  name: string;
  enrolled: number;
  capacity: number;
  percentage: number;
};

interface DashboardChartsProps {
  revenueData: RevenueData[];
  fillRates: FillRateData[];
}

export function DashboardCharts({ revenueData, fillRates }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Graphique des revenus sur 6 mois */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenus perçus (6 derniers mois)</CardTitle>
          <CardDescription>Évolution des encaissements en dirhams (DH)</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit=" DH" />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toFixed(2)} DH`, "Encaissé"]}
                  contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Taux de remplissage par groupe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Taux de remplissage par groupe</CardTitle>
          <CardDescription>Pourcentage d'occupation par rapport à la capacité</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fillRates} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, "Remplissage"]}
                  contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", borderRadius: "8px" }}
                />
                <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
