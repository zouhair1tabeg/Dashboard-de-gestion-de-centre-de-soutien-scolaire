import { AlertCircle, BookOpen, Users, Wallet } from "lucide-react";
import { connection } from "next/server";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import {
  getGroupFillRates,
  getKpis,
  getLatePayments,
  getRevenueLast6Months,
  getTodaySessions,
  getTopAbsentStudents,
  type SessionToday,
} from "@/lib/dashboard";
import { formatDH, todayInputValue } from "@/lib/format";

import { MonthSelector } from "./MonthSelector";
import { RevenueChart } from "./revenue-chart";

// Lecture de la session et de données non mises en cache : rendu bloquant voulu.
export const instant = false;

const SESSION_STATUS: Record<
  SessionToday["status"],
  { label: string; className: string }
> = {
  PLANNED: { label: "Planifiée", className: "bg-blue-50 text-blue-700" },
  DONE: { label: "Effectuée", className: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Annulée", className: "bg-red-50 text-red-700" },
  POSTPONED: { label: "Reportée", className: "bg-orange-50 text-orange-700" },
  RESCHEDULED: { label: "Décalée", className: "bg-violet-50 text-violet-700" },
};

/** « A » -> « Groupe A », « Groupe A » reste inchangé. */
function groupLabel(name: string): string {
  return /^groupe/i.test(name) ? name : `Groupe ${name}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // Le tableau de bord reflète l'état courant de la base : rendu à chaque requête.
  await connection();

  const params = await searchParams;
  const currentMonth = todayInputValue().slice(0, 7);
  const month = params.month || currentMonth;

  const [
    kpi,
    revenues,
    sessionsToday,
    latePayments,
    groupRates,
    absentStudents,
  ] = await Promise.all([
    getKpis(month),
    getRevenueLast6Months(month),
    getTodaySessions(),
    getLatePayments(month),
    getGroupFillRates(),
    getTopAbsentStudents(month),
  ]);

  // Sélecteur de mois : 12 derniers mois, libellés avec majuscule initiale.
  const year = Number(currentMonth.slice(0, 4));
  const currentMonthIndex = Number(currentMonth.slice(5, 7)) - 1;
  const months: { value: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(year, currentMonthIndex - i, 1);
    const value = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const monthName = m.toLocaleString("fr-FR", { month: "long" });
    months.push({
      value,
      label: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${m.getFullYear()}`,
    });
  }

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={todayLabel}
        actions={<MonthSelector months={months} defaultMonth={month} />}
      />

      {/* ---- Ligne 1 : KPI ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">Encaissé ce mois</p>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Wallet className="size-5" />
            </div>
          </div>
          <p className="whitespace-nowrap text-3xl font-bold tracking-tight">
            {formatDH(kpi.collected)}
          </p>
          <div className="mt-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Attendu : {formatDH(kpi.expected)}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${kpi.fillRate}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(kpi.fillRate)} % de l&apos;attendu
            </p>
          </div>
        </Card>

        <Card className="gap-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">Reste à payer</p>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertCircle className="size-5" />
            </div>
          </div>
          <p
            className={`whitespace-nowrap text-3xl font-bold tracking-tight ${
              kpi.remainder > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {formatDH(kpi.remainder)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpi.unpaidCount} impayé{kpi.unpaidCount > 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="gap-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">Élèves actifs</p>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="size-5" />
            </div>
          </div>
          <p className="whitespace-nowrap text-3xl font-bold tracking-tight">
            {kpi.activeStudents}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpi.totalEnrollments} inscriptions
          </p>
        </Card>

        <Card className="gap-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">Groupes actifs</p>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <BookOpen className="size-5" />
            </div>
          </div>
          <p className="whitespace-nowrap text-3xl font-bold tracking-tight">
            {kpi.activeGroups}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpi.freeSeatsTotal} places libres
          </p>
        </Card>
      </div>

      {/* ---- Ligne 2 : graphique + séances du jour ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-4 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">
            Revenus encaissés sur 6 mois
          </h2>
          <RevenueChart revenues={revenues} currentMonth={month} />
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-semibold">Séances d&apos;aujourd&apos;hui</h2>
          {sessionsToday.length > 0 ? (
            <div className="divide-y">
              {sessionsToday.map((session) => {
                const status = SESSION_STATUS[session.status];
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {session.startTime} - {session.endTime}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.subjectName} · {groupLabel(session.groupName)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune séance programmée pour aujourd&apos;hui
            </p>
          )}
        </Card>
      </div>

      {/* ---- Ligne 3 : retards + remplissage ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Paiements en retard</h2>
            {kpi.unpaidCount > 0 ? (
              <span className="text-sm text-muted-foreground">
                {kpi.unpaidCount} en cours
              </span>
            ) : null}
          </div>
          {latePayments.length > 0 ? (
            <div className="space-y-2">
              {latePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {payment.studentFullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {groupLabel(payment.groupName)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatDH(payment.amountDue - payment.amountPaid)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        dû : {formatDH(payment.amountDue)}
                      </p>
                    </div>
                    <a
                      href={`/payments?month=${payment.month}&status=UNPAID`}
                      className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Régler
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun paiement en attente pour le moment.
            </p>
          )}
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-semibold">
            Taux de remplissage des groupes
          </h2>
          {groupRates.length > 0 ? (
            <div className="space-y-3">
              {groupRates.map((rate) => (
                <div key={rate.groupId} className="flex items-start gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium">{rate.groupName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rate.subjectName} · {rate.levelName}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {rate.enrolledCount} / {rate.capacity}
                      </span>
                      <span>{rate.fillRate} %</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          rate.fillRate >= 70 ? "bg-emerald-600" : "bg-amber-500"
                        }`}
                        style={{ width: `${rate.fillRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun groupe actif pour le moment.
            </p>
          )}
        </Card>
      </div>

      {/* ---- Ligne 4 : élèves à surveiller ---- */}
      <Card className="gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Élèves à surveiller</h2>
          <a
            href="/students"
            className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Voir tout
          </a>
        </div>
        {absentStudents.length > 0 ? (
          <div className="space-y-2">
            {absentStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {groupLabel(student.groupName)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-amber-600">
                  {student.absenceCount} absence{student.absenceCount !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun élève à surveiller ce mois-ci.
          </p>
        )}
      </Card>
    </div>
  );
}
