import { connection } from "next/server";

import { formatDH, todayInputValue } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { MonthSelector } from "./MonthSelector";
import { getKpis, getRevenueLast6Months, getTodaySessions, getLatePayments, getGroupFillRates, getTopAbsentStudents } from "@/lib/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  // Le tableau de bord reflète l'état courant de la base : rendu à chaque requête.
  await connection();

  const params = await searchParams;
  const month = params.month || new Date().toISOString().slice(0, 7);

  // Charger toutes les données en parallèle côté serveur
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

  // --- Sélecteur de mois (12 derniers mois, fuseau Maroc) ---
  const todayValue = todayInputValue();
  const year = Number(todayValue.slice(0, 4));
  const currentMonthIndex = Number(todayValue.slice(5, 7)) - 1;
  const months: { value: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(year, currentMonthIndex - i, 1);
    const value = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      value,
      label: `${m.toLocaleString("fr-FR", { month: "long" })} ${m.getFullYear()}`,
    });
  }
  // --- Cartes KPI ---
  const kpiCards = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">Encaissé ce mois</div>
            <div className="text-2xl font-bold">{formatDH(kpi.collected)}</div>
          </div>
          <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="size-8 text-primary" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Montant attendu</div>
          <div className="text-right">
            <span className="text-lg font-medium">{formatDH(kpi.expected)}</span>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">Progression</div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary rounded-full h-full transition-width ease-in-out"
              style={{ width: `${kpi.fillRate}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpi.fillRate.toFixed(0)} % de l'attendu
          </div>
        </div>
      </Card>

      <Card className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">
              Reste à payer
              {kpi.unpaidCount > 0 && (
                <span className="text-red-600 text-sm font-medium ml-2">
                  {`(${kpi.unpaidCount} impayé${kpi.unpaidCount > 1 ? "s" : ""})`}
                </span>
              )}
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: kpi.remainder > 0 ? "red" : "green" }}
            >
              {kpi.remainderDH}
            </div>
          </div>
          <div className="w-24 h-24 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
            <svg className="size-8 text-error" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Non réglé</div>
          <div className="text-right">
            <span className="text-lg font-medium">{kpi.remainderDH}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Élèves actifs</div>
            <div className="text-2xl font-bold">{kpi.activeStudents}</div>
          </div>
          <div className="w-24 h-24 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <svg className="size-8 text-success" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v2h2v-2zm0-4h-2V7h2v2zm0-4v2h2v-2z" />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">Inscriptions</div>
          <div className="text-right font-medium">{kpi.totalEnrollments}</div>
        </div>
      </Card>

      <Card className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Groupes actifs</div>
            <div className="text-2xl font-bold">{kpi.activeGroups}</div>
          </div>
          <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="size-8 text-primary" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v2h2v-2zm0-4h-2V7h2v2zm0-4v2h2v-2zM2 4h6v14H2V4zm16 14H10v-2h6v2zm0-10H10v-2h6v2z" />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">Places libres</div>
          <div className="text-right font-medium">{kpi.freeSeatsTotal}</div>
        </div>
      </Card>
    </div>
  );

  // --- Ligne 2 : Graphique + Séances aujourd'hui ---
  const line2cols = (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <Card className="p-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Revenus encaissés sur 6 mois
          </h3>
          <span className="text-xs text-muted-foreground">
            Mois:{" "}{revenues.length > 0 ? revenues[0].label : "en cours"}
          </span>
        </div>
        {revenues.length > 0 ? (
          <div>
            {revenues.map((rev) => (
              <div
                key={rev.month}
                className="flex justify-between items-center"
              >
                <span className="text-sm">
                  {rev.label}: {formatDH(rev.amount)}</span
                >
                <div
                  className="h-4 bg-muted rounded-full overflow-hidden w-48"
                  style={{ width: `${(rev.amount / 150000) * 100}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Aucune donnée disponible
          </p>
        )}
      </Card>

      <Card className="p-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Séances d'aujourd'hui</h3>
        </div>
        {sessionsToday.length > 0 ? (
          <div>
            {sessionsToday.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <span className="text-sm font-medium">
                  {session.startTime} - {session.endTime}
                </span>
                <span className="text-xs font-medium">
                  {session.groupName || "Groupe inconnu"}
                </span>
                <span
                  className={
                    session.status === "PLANNED"
                      ? "inline-block px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                      : session.status === "DONE"
                        ? "inline-block px-2 py-1 rounded text-xs font-medium bg-success/10 text-success"
                        : session.status === "CANCELLED"
                          ? "inline-block px-2 py-1 rounded text-xs font-medium bg-error/10 text-error"
                          : "inline-block px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning"
                  }
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Aucune séance programmée pour aujourd'hui
          </p>
        )}
      </Card>
    </div>
  );

  // --- Ligne 3 : Retards + Taux de remplissage ---
  const line3cols = (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <Card className="p-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Paiements en retard</h3>
          {kpi.unpaidCount > 0 && (
            <span className="text-sm text-red-600">
              {kpi.unpaidCount} en cours
            </span>
          )}
        </div>
        {latePayments.length > 0 ? (
          <div>
            {latePayments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${payment.status === "UNPAID" || payment.status === "PARTIAL" ? "border-red-200" : "border-gray-200"} mb-2`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium truncate w-40">
                    {payment.studentFullName || "Élève inconnu"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {payment.groupName || "Groupe inconnu"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{formatDH(payment.amountDue)}</span>
                  <span className="text-xs text-muted-foreground">
                    / {formatDH(payment.amountPaid)}
                  </span>
                </div>
                <a
                  href={`/payments?month=${payment.month}&status=UNPAID`}
                  className="rounded-md bg-primary text-white text-sm py-2 px-4 hover:bg-primary/90"
                >
                  Régler
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Aucun paiement en attente pour le moment.
          </p>
        )}
      </Card>

      <Card className="p-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Taux de remplissage</h3>
        </div>
        {groupRates.length > 0 ? (
          <div>
            {groupRates.map((rate) => (
              <div
                key={rate.groupId}
                className="mb-3 flex items-start gap-3"
              >
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
                    <span className="text-xs text-muted-foreground">
                      {rate.enrolledCount}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      / {rate.capacity}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden my-1">
                    <div
                      className={`h-full ${rate.fillRate >= 70 ? "bg-green-500" : "bg-amber-500"} rounded-full`}
                      style={{ width: `${rate.fillRate}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium">{rate.fillRate} %</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Aucun groupe actif pour le moment.
          </p>
        )}
      </Card>
    </div>
  );

  // --- Élèves à surveiller ---
  const monitorBlock = (
    <Card className="p-6 rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Élèves à surveiller</h3>
        <a
          href="/students"
          className="rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
        >
          Voir tout
        </a>
      </div>
      {absentStudents.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {absentStudents.slice(0, 5).map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium truncate">
                  {student.fullName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {student.groupName || "Groupe inconnu"}
                </span>
              </div>
              <span className="text-sm font-medium text-amber-600">
                {student.absenceCount} absence
                {student.absenceCount !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Aucun élève à surveiller ce mois-ci.
        </p>
      )
      }
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* ---- EN-TÊTE ---- */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Tableau de bord</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>

          {/* Sélecteur de mois */}
          <MonthSelector months={months} defaultMonth={month} />
        </div>

        {/* ---- LIGNES DE CONTENU ---- */}
        {kpiCards}
        {line2cols}
        {line3cols}
        {monitorBlock}
      </div>
    </div>
  );
}