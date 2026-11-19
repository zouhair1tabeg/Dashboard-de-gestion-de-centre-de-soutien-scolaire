import { ArrowUpRight, BookOpen, CalendarDays, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  {
    href: "/students",
    title: "Élèves",
    description: "Fiches élèves, coordonnées et inscriptions aux groupes.",
    icon: Users,
  },
  {
    href: "/subjects",
    title: "Matières & Groupes",
    description: "Matières, niveaux, groupes, tarifs et capacités.",
    icon: BookOpen,
  },
  {
    href: "/sessions",
    title: "Séances",
    description: "Planning hebdomadaire, appel et séances particulières.",
    icon: CalendarDays,
  },
  {
    href: "/payments",
    title: "Paiements",
    description: "Suivi mensuel des paiements en espèces, par inscription.",
    icon: Wallet,
  },
] as const;

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default async function DashboardPage() {
  await connection();

  return (
    <div className="space-y-8">
      <PageHeader title="Tableau de bord" description={formatToday()} />

      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.33_0.05_205)] px-6 py-8 text-primary-foreground shadow-sm sm:px-10 sm:py-10">
        <div className="absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-28 right-24 size-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/70 uppercase">
            Centre Prime
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bienvenue dans votre espace de gestion
          </h2>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            Pilotez les élèves, les groupes, le planning des séances et les paiements
            mensuels depuis une seule interface.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Accès rapide</h2>
            <p className="text-sm text-muted-foreground">Les modules de gestion du centre.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold tracking-tight">{item.title}</h3>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
