import { ArrowLeft, CalendarDays, CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLongDate, toDateKey } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { AttendanceSheet } from "./attendance-sheet";
import { SESSION_STATUS_META } from "../types";

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

export default async function SessionAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          name: true,
          level: { select: { name: true, subject: { select: { name: true } } } },
        },
      },
      attendances: { select: { studentId: true, status: true } },
    },
  });

  if (!session) {
    notFound();
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      groupId: session.groupId,
      startDate: { lte: session.replacementDate ?? session.date },
      OR: [
        { endDate: null },
        { endDate: { gte: session.replacementDate ?? session.date } },
      ],
    },
    select: {
      student: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { student: { fullName: "asc" } },
  });

  const attendanceByStudent = new Map(
    session.attendances.map((attendance) => [attendance.studentId, attendance.status]),
  );

  const roster = [...new Map(enrollments.map((entry) => [entry.student.id, entry.student])).values()]
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
    .map((student) => ({
      id: student.id,
      fullName: student.fullName,
      phone: student.phone,
      status: attendanceByStudent.get(student.id) ?? null,
    }));

  const meta = SESSION_STATUS_META[session.status];
  const isCancelled = session.status === "CANCELLED";
  const effectiveDate = session.replacementDate ?? session.date;
  const sessionDate = toDateKey(effectiveDate);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={`/sessions?view=week&date=${sessionDate}`}>
          <ArrowLeft className="size-4" />
          Retour au planning
        </Link>
      </Button>

      <PageHeader
        title="Feuille d'appel"
        description={`${session.group.level.subject.name} · ${session.group.level.name} · ${session.group.name}`}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={meta.badgeClass}>
          {meta.label}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <CalendarDays className="size-3" />
          {formatLongDate(sessionDate)}
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          {session.startTime} – {session.endTime}
        </Badge>
        {session.replacementDate ? (
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
            Reportée du {formatDate(session.date)}
          </Badge>
        ) : null}
      </div>

      {session.note ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {session.note}
        </p>
      ) : null}

      {isCancelled ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Cette séance est annulée : l&apos;appel n&apos;est pas disponible.</span>
        </div>
      ) : null}

      <AttendanceSheet sessionId={session.id} students={roster} readOnly={isCancelled} />
    </div>
  );
}
