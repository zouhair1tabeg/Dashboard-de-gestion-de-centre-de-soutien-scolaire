import { connection } from "next/server";
import { CalendarDays, Users, Wallet, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getPayments } from "@/app/(dashboard)/payments/actions";
import { DashboardCharts } from "./dashboard-charts";

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Helper: current month YYYY-MM
const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Helper: last 6 months list
const getLast6Months = (): string[] => {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
};

export default async function DashboardPage() {
  await connection();
  const currentMonth = getCurrentMonth();
  const last6Months = getLast6Months();

  // 1. Récupérer les paiements du mois en cours
  const paymentsRes = await getPayments({ month: currentMonth });
  const currentPayments = paymentsRes.ok && paymentsRes.payments ? paymentsRes.payments : [];

  // Totaux financiers du mois
  const expectedThisMonth = currentPayments.reduce((sum, p) => sum + Number(p.amountDue), 0);
  const collectedThisMonth = currentPayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const pendingPayments = currentPayments.filter((p) => p.status === "UNPAID");
  const pendingCount = pendingPayments.length;

  // 2. Inscriptions et groupes actifs
  const activeEnrollments = await prisma.enrollment.findMany({
    where: { isActive: true },
    include: {
      student: { select: { id: true, fullName: true, phone: true } },
      group: {
        include: {
          level: {
            include: {
              subject: { select: { name: true } },
            },
          },
          schedules: true,
        },
      },
    },
  });

  const activeStudentsCount = new Set(activeEnrollments.map((e) => e.studentId)).size;
  const activeGroupsCount = new Set(activeEnrollments.map((e) => e.groupId)).size;

  // 3. Séances du jour
  const today = new Date();

  const todaySessionsCount = await prisma.session.count({
    where: {
      date: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
      status: { not: "CANCELLED" },
    },
  });

  // 4. Taux de remplissage par groupe
  const groupStatsMap = new Map<string, { groupName: string; levelName: string; subjectName: string; capacity: number; enrolled: number }>();

  activeEnrollments.forEach((e) => {
    const g = e.group;
    if (!groupStatsMap.has(g.id)) {
      groupStatsMap.set(g.id, {
        groupName: g.name,
        levelName: g.level.name,
        subjectName: g.level.subject.name,
        capacity: g.capacity,
        enrolled: 0,
      });
    }
    const stats = groupStatsMap.get(g.id)!;
    stats.enrolled += 1;
  });

  const fillRates = Array.from(groupStatsMap.values()).map((item) => ({
    name: `${item.subjectName} - ${item.groupName}`,
    enrolled: item.enrolled,
    capacity: item.capacity,
    percentage: item.capacity > 0 ? Math.round((item.enrolled / item.capacity) * 100) : 0,
  }));

  // 5. Revenus sur 6 mois
  const allPaymentsLast6 = await prisma.payment.findMany({
    where: {
      month: { in: last6Months },
    },
  });

  const revenueLast6Months = last6Months.map((m) => {
    const monthPay = allPaymentsLast6.filter((p) => p.month === m);
    const total = monthPay.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const [year, month] = m.split("-");
    const label = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(
      new Date(Number(year), Number(month) - 1, 1)
    );
    return { month: label, amount: total };
  });

  // 6. Élèves avec beaucoup d'absences (plus de 2 absences sur les séances enregistrées)
  const allAttendances = await prisma.attendance.findMany({
    where: { status: "ABSENT" },
    include: {
      student: { select: { id: true, fullName: true, phone: true } },
      session: { select: { date: true, group: { select: { name: true } } } },
    },
  });

  const absenceMap = new Map<string, { student: { id: string; fullName: string; phone: string }; count: number }>();
  allAttendances.forEach((att) => {
    if (!absenceMap.has(att.studentId)) {
      absenceMap.set(att.studentId, { student: att.student, count: 0 });
    }
    absenceMap.get(att.studentId)!.count += 1;
  });

  const absentStudents = Array.from(absenceMap.values())
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const collectionRate = expectedThisMonth > 0 ? Math.round((collectedThisMonth / expectedThisMonth) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Tableau de bord" description={formatToday()} />

      {/* Cartes de statistiques clés */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Encaissé ce mois</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{collectedThisMonth.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sur {expectedThisMonth.toFixed(2)} DH attendus ({collectionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Impayés du mois</CardTitle>
            <AlertCircle className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Inscriptions en attente de règlement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activité du Centre</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Élèves actifs • {activeGroupsCount} groupes ouverts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Séances du jour</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessionsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Séances prévues aujourd&apos;hui</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <DashboardCharts revenueData={revenueLast6Months} fillRates={fillRates} />

      {/* Tableaux détaillés : Impayés et Absences */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Liste des impayés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Impayés récents</CardTitle>
            <CardDescription>Paiements non réglés pour le mois en cours</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun impayé pour ce mois !</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="text-right">Montant Dû</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.slice(0, 5).map((payment) => {
                    const enrollment = activeEnrollments.find((e) => e.id === payment.enrollmentId);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">{enrollment?.student.fullName || "Élève"}</div>
                          <div className="text-xs text-muted-foreground">
                            {enrollment?.group.level.subject.name} - {enrollment?.group.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">
                          {Number(payment.amountDue).toFixed(2)} DH
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Élèves avec absences fréquentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Élèves absents fréquemment</CardTitle>
            <CardDescription>Plus de 2 absences enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            {absentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun élève signalé absent fréquemment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="text-right">Absences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentStudents.map((item) => (
                    <TableRow key={item.student.id}>
                      <TableCell>
                        <div className="font-medium">{item.student.fullName}</div>
                        <div className="text-xs text-muted-foreground">{item.student.phone || "Pas de téléphone"}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">
                        {item.count} séances
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
