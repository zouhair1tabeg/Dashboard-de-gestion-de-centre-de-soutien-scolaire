import { FC } from "react";

/**
 * Chart displaying revenues for the last 6 months as a bar chart
 * Currently a placeholder - uses simple text display instead of Recharts
 * to avoid TypeScript type conflicts
 */
export const RevenueChart: FC<{ revenues: { month: string; amount: number }[] }> = ({
  revenues,
}) => {
  if (!revenues || revenues.length === 0) {
    return null;
  }

  // Sort revenues by month (oldest first)
  const sorted = [...revenues].sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  return (
    <div className="h-64 bg-white p-6 rounded-xl border shadow-sm">
      <div className="text-sm text-muted-foreground mb-4">
        Revenus encaissés sur 6 mois
      </div>
      <div className="space-y-2">
        {sorted.map((rev) => (
          <div key={rev.month} className="flex justify-between items-center">
            <span className="text-sm">
              {new Intl.DateTimeFormat("fr-FR", {
                month: "long",
                year: "numeric",
              }).format(new Date(rev.month))}: {rev.amount} DH</span>
            <div
              className={`h-4 bg-muted rounded-full overflow-hidden w-48`}
              style={{ width: `${(rev.amount / 150000) * 100}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};