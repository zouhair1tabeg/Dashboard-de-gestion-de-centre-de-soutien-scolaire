import { FC } from "react";

/**
 * List of sessions for today with status badges
 * Empty state message in French
 */
export const SessionList: FC<{ sessions: any[] }> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Aucune séance programmée pour aujourd'hui.
      </p>
    );
  }

  return (
    <div>
      {sessions.map((session) => {
        const statusMap: any = {
          PLANNED: "Planifiée",
          DONE: "Effectuée",
          POSTPONED: "Reportée",
          CANCELLED: "Annulée",
          RESCHEDULED: "Décalée",
        };

        return (
          <div key={session.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <span className="text-sm font-medium">
              {session.startTime} - {session.endTime}
            </span>
            <span className="text-xs font-medium">
              {session.group?.name || "Groupe inconnu"}
            </span>
            <span className={
              statusMap[session.status]
                ? `inline-block px-2 py-1 rounded text-xs font-medium ${statusMap[session.status].toLowerCase() === "planifiée"
                  ? "bg-primary/10 text-primary"
                  : statusMap[session.status].toLowerCase() === "faite"
                    ? "bg-success/10 text-success"
                    : statusMap[session.status].toLowerCase() === "annulée"
                      ? "bg-error/10 text-error"
                      : "bg-warning/10 text-warning"}`
                : "px-2 py-1 rounded text-xs font-medium bg-gray/10 text-muted-foreground"
            }>
              {statusMap[session.status] || session.status}
            </span>
          </div>
        );
      })}
    </div>
  );
};