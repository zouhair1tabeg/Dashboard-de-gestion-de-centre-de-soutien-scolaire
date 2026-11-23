import { FC } from "react";
import { formatDH } from "@/lib/format";
import { Button } from "@/components/ui/button";

/**
 * List of late/partial payments for the month
 * Shows student, group, amount due, and "Régler" button
 */
export const LatePayments: FC<{ latePayments: any[]; kpi: any }> = ({ latePayments }) => {
  // If no data provided, show empty state
  if (!latePayments) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        Aucun paiement en attente pour le moment.
      </div>
    );
  }

  if (latePayments.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        Tous les paiements sont à jour pour ce mois.
      </div>
    );
  }

  return (
    <div>
      {latePayments.map((payment, index) => {
        const statusMap: any = {
          UNPAID: "Impayé",
          PARTIAL: "Partiel",
          PAID: "Payé",
        };

        const statusLabel = statusMap[payment.status] || payment.status;
        const isLate =
          payment.status === "UNPAID" || payment.status === "PARTIAL";

        return (
          <div
            key={payment.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${isLate ? "border-red-200" : "border-gray-200"} mb-2`}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium truncate w-40">
                {payment.enrolled?.student?.fullName || "Élève inconnu"}
              </span>
              <span className="text-xs text-muted-foreground">
                {payment.enrolled?.group?.name || "Groupe inconnu"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">
                {formatDH(Number(payment.amountDue))}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatDH(Number(payment.amountPaid))}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navigate to payments page with filter
                window.location.href = `/payments?month=${payment.month}&status=UNPAID`;
              }}
            >
              Régler
            </Button>
          </div>
        );
      })}
    </div>
  );
};