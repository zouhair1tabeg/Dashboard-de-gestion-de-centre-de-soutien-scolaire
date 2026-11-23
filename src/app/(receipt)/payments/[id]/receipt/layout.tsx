import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";

import "./receipt.css";

// La lecture de la session impose un rendu bloquant côté serveur.
export const instant = false;

/**
 * Layout isolé du reçu : aucun élément de navigation du tableau de bord.
 * Le <html> et le <body> proviennent du root layout.
 */
export default async function ReceiptLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return <div className="min-h-svh bg-white text-foreground">{children}</div>;
}
