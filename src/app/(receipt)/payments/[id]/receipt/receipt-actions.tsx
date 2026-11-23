"use client";

import { Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Actions du reçu, masquées à l'impression. */
export function ReceiptActions() {
  return (
    <div className="flex items-center justify-end gap-2 print:hidden">
      <Button
        type="button"
        onClick={() => window.print()}
        className="gap-2 print:hidden"
      >
        <Printer className="size-4" />
        Imprimer
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => window.close()}
        className="gap-2 print:hidden"
      >
        <X className="size-4" />
        Fermer
      </Button>
    </div>
  );
}
