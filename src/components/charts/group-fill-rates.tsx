import { FC } from "react";

/**
 * Display progress bars for group fill rates
 * Each group shows enrolled/capacity with color coding
 */
export const GroupFillRates: FC<{ fillRates: any[] }> = ({ fillRates }) => {
  if (!fillRates || fillRates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Aucun groupe actif pour le moment.
      </p>
    );
  }

  return (
    <div>
      {fillRates.map((rate) => (
        <div key={rate.groupId} className="mb-3 flex items-start gap-3">
          <div className="flex-0 w-20">
            <span className="text-sm font-medium">
              {rate.groupName}
            </span>
            <span className="text-xs text-muted-foreground">
              {rate.subjectName} · {rate.levelName}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{rate.enrolledCount}</span>
              <span className="text-xs text-muted-foreground ml-1">{rate.capacity}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden my-1">
              <div
                className={`h-full bg-${rate.color === "green" ? "success" : "warning"} rounded-full transition-width ease-in-out`}
                style={{ width: `${rate.fillRate}%` }}
              />
            </div>
            <div className="text-xs font-medium">
              {rate.fillRate} %
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};