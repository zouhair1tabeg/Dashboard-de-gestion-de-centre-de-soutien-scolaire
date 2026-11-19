import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
