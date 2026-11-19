import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

// L'accès est conditionné à la session : rendu à la requête.
export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <AppSidebar email={session.user.email} />
      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
