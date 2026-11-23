import { prisma } from "@/lib/prisma";
import { formatDH, todayInputValue } from "./format";

export interface KPIs {
  collected: number;
  expected: number;
  remainder: number;
  remainderDH: string;
  fillRate: number;
  unpaidCount: number;
  activeStudents: number;
  totalEnrollments: number;
  activeGroups: number;
  freeSeatsTotal: number;
}

export interface RevenueMonth {
  month: string;
  label: string;
  amount: number;
}

export interface SessionToday {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PLANNED" | "DONE" | "POSTPONED" | "CANCELLED" | "RESCHEDULED";
  groupName: string;
  subjectName: string;
}

export interface LatePayment {
  id: string;
  studentFullName: string;
  groupName: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

export interface GroupFillRate {
  groupId: string;
  groupName: string;
  subjectName: string;
  levelName: string;
  enrolledCount: number;
  capacity: number;
  fillRate: number;
}

export interface AbsentStudent {
  id: string;
  fullName: string;
  groupName: string;
  absenceCount: number;
}

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** Mois courant au format YYYY-MM dans le fuseau du Maroc (UTC+1). */
function currentMonth(): string {
  return todayInputValue().slice(0, 7);
}

/** Décalage d'un mois YYYY-MM de `offset` mois. */
function addMonths(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Bornes UTC d'un mois (les dates métier sont stockées en @db.Date). */
function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

/** Obtient les KPIs du tableau de bord pour un mois donné. */
export async function getKpis(month?: string): Promise<KPIs> {
  const targetMonth = month ?? currentMonth();

  const payments = await prisma.payment.findMany({
    where: { month: targetMonth },
  });

  // Même calcul que la page /payments : encaissé = somme(amountPaid),
  // attendu = somme(amountDue), reste = somme(amountDue - amountPaid).
  const collected = payments.reduce(
    (sum, payment) => sum + Number(payment.amountPaid),
    0
  );
  const expected = payments.reduce(
    (sum, payment) => sum + Number(payment.amountDue),
    0
  );
  const remainder = expected - collected;
  const unpaidCount = payments.filter(
    (payment) => payment.status === "UNPAID" || payment.status === "PARTIAL"
  ).length;

  const [activeStudents, totalEnrollments, activeGroups, groups] =
    await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.enrollment.count({ where: { isActive: true } }),
      prisma.group.count({ where: { isActive: true } }),
      prisma.group.findMany({
        where: { isActive: true },
        include: {
          enrollments: { where: { isActive: true }, select: { id: true } },
        },
      }),
    ]);

  const freeSeatsTotal = groups.reduce(
    (sum, group) => sum + Math.max(0, group.capacity - group.enrollments.length),
    0
  );

  return {
    collected,
    expected,
    remainder,
    remainderDH: formatDH(remainder),
    fillRate: expected > 0 ? (collected / expected) * 100 : 0,
    unpaidCount,
    activeStudents,
    totalEnrollments,
    activeGroups,
    freeSeatsTotal,
  };
}

/** Obtient les revenus encaissés des 6 derniers mois (mois cible inclus). */
export async function getRevenueLast6Months(
  month?: string
): Promise<RevenueMonth[]> {
  const targetMonth = month ?? currentMonth();
  const firstMonth = addMonths(targetMonth, -5);

  const revenueData = await prisma.payment.groupBy({
    by: ["month"],
    where: { month: { gte: firstMonth, lte: targetMonth } },
    _sum: { amountPaid: true },
  });

  const amounts = new Map(
    revenueData.map((entry) => [
      entry.month,
      Number(entry._sum.amountPaid ?? 0),
    ])
  );

  const result: RevenueMonth[] = [];
  for (let offset = -5; offset <= 0; offset++) {
    const key = addMonths(targetMonth, offset);
    const monthIndex = Number(key.slice(5, 7)) - 1;
    result.push({
      month: key,
      label: MONTH_LABELS[monthIndex],
      amount: amounts.get(key) ?? 0,
    });
  }

  return result;
}

/** Obtient les séances du jour (fuseau Maroc). */
export async function getTodaySessions(): Promise<SessionToday[]> {
  const today = todayInputValue();
  const dayStart = new Date(`${today}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      status: { not: "CANCELLED" },
    },
    include: {
      group: {
        include: { level: { include: { subject: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    date: today,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    groupName: session.group.name,
    subjectName: session.group.level.subject.name,
  }));
}

/** Obtient les paiements en retard (UNPAID ou PARTIAL). */
export async function getLatePayments(month?: string): Promise<LatePayment[]> {
  const targetMonth = month ?? currentMonth();

  const payments = await prisma.payment.findMany({
    where: {
      month: targetMonth,
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    include: {
      enrollment: {
        include: {
          student: { select: { fullName: true } },
          group: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { amountDue: "desc" }],
    take: 8,
  });

  return payments.map((payment) => ({
    id: payment.id,
    studentFullName: payment.enrollment.student.fullName,
    groupName: payment.enrollment.group.name,
    month: payment.month,
    amountDue: Number(payment.amountDue),
    amountPaid: Number(payment.amountPaid),
    status: payment.status,
  }));
}

/** Obtient le taux de remplissage des groupes actifs. */
export async function getGroupFillRates(): Promise<GroupFillRate[]> {
  const groups = await prisma.group.findMany({
    where: { isActive: true },
    include: {
      enrollments: { where: { isActive: true }, select: { id: true } },
      level: { include: { subject: true } },
    },
    orderBy: { name: "asc" },
  });

  return groups.map((group) => {
    const enrolledCount = group.enrollments.length;
    return {
      groupId: group.id,
      groupName: group.name,
      subjectName: group.level.subject.name,
      levelName: group.level.name,
      enrolledCount,
      capacity: group.capacity,
      fillRate:
        group.capacity > 0 ? Math.round((enrolledCount / group.capacity) * 100) : 0,
    };
  });
}

/** Obtient les 5 élèves avec le plus d'absences sur le mois. */
export async function getTopAbsentStudents(
  month?: string
): Promise<AbsentStudent[]> {
  const targetMonth = month ?? currentMonth();
  const { start, end } = monthRange(targetMonth);

  const absences = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      status: "ABSENT",
      session: { date: { gte: start, lt: end } },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  if (absences.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { id: { in: absences.map((absence) => absence.studentId) } },
    include: {
      enrollments: {
        where: { isActive: true },
        include: { group: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const studentsById = new Map(students.map((student) => [student.id, student]));

  return absences.flatMap((absence) => {
    const student = studentsById.get(absence.studentId);
    if (!student) return [];
    return [
      {
        id: student.id,
        fullName: student.fullName,
        groupName: student.enrollments[0]?.group.name ?? "Groupe inconnu",
        absenceCount: absence._count.id,
      },
    ];
  });
}
