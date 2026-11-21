import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  addDays,
  addMonths,
  dayOfWeek,
  formatMonthYear,
  formatWeekRange,
  isSameMonth,
  monthDays,
  monthGridRange,
  parseDateOnly,
  toDateKey,
  weekDays,
  weekRange,
  WEEKDAY_SHORT_LABELS,
} from "@/lib/calendar";
import { todayInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { GenerateSessionsDialog } from "./generate-sessions-dialog";
import { SessionChip } from "./session-dialogs";
import type { GroupOption, SessionView } from "./types";

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

const MONTH_WEEKDAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."] as const;

type CalendarView = "week" | "month";

function isValidDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function calendarHref(view: CalendarView, date: string): string {
  return `/sessions?view=${view}&date=${date}`;
}

function dayNumber(value: string): number {
  return Number(value.slice(8, 10));
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  // La date du jour est calculée à la requête (jamais au prérendu).
  await connection();

  const params = await searchParams;
  const view: CalendarView = params.view === "week" ? "week" : "month";
  const anchor = isValidDateInput(params.date) ? params.date : todayInputValue();
  const today = todayInputValue();

  const range =
    view === "week" ? weekRange(anchor) : monthGridRange(anchor);

  const [rawSessions, groups] = await Promise.all([
    prisma.session.findMany({
      where: {
        OR: [
          { date: { gte: parseDateOnly(range.start), lte: parseDateOnly(range.end) } },
          {
            replacementDate: {
              gte: parseDateOnly(range.start),
              lte: parseDateOnly(range.end),
            },
          },
        ],
      },
      include: {
        group: {
          select: {
            name: true,
            level: { select: { name: true, subject: { select: { name: true } } } },
          },
        },
        _count: { select: { attendances: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.group.findMany({
      where: { isActive: true },
      orderBy: [
        { level: { subject: { name: "asc" } } },
        { level: { name: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        level: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
  ]);

  const sessions: SessionView[] = rawSessions
    .map((session) => ({
      id: session.id,
      groupId: session.groupId,
      groupName: session.group.name,
      subjectName: session.group.level.subject.name,
      levelName: session.group.level.name,
      date: toDateKey(session.date),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      replacementDate: session.replacementDate ? toDateKey(session.replacementDate) : null,
      note: session.note,
      attendanceCount: session._count.attendances,
    }))
    .filter((session) => {
      // Une séance reportée est affichée à sa nouvelle date.
      const effectiveDate = session.replacementDate ?? session.date;

      return effectiveDate >= range.start && effectiveDate <= range.end;
    });

  const groupOptions: GroupOption[] = groups.map((group) => ({
    id: group.id,
    label: `${group.level.subject.name} · ${group.level.name} · ${group.name}`,
  }));

  const sessionsByDay = new Map<string, SessionView[]>();

  for (const session of sessions) {
    const effectiveDate = session.replacementDate ?? session.date;
    const list = sessionsByDay.get(effectiveDate) ?? [];
    list.push(session);
    sessionsByDay.set(effectiveDate, list);
  }

  const periodLabel = view === "week" ? formatWeekRange(anchor) : formatMonthYear(anchor);
  const previousAnchor = view === "week" ? addDays(anchor, -7) : addMonths(anchor, -1);
  const nextAnchor = view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1);
  const days = view === "week" ? weekDays(anchor) : monthDays(anchor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Séances"
        description="Planning hebdomadaire, séances du mois, appel et modifications ponctuelles."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/sessions/schedules">
                <Settings2 className="size-4" />
                Horaires
              </Link>
            </Button>
            <GenerateSessionsDialog
              groups={groupOptions}
              trigger={
                <Button>
                  <Sparkles className="size-4" />
                  Générer les séances
                </Button>
              }
            />
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={calendarHref(view, previousAnchor)}
                aria-label={view === "week" ? "Semaine précédente" : "Mois précédent"}
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-44 px-1">
              <p className="text-sm font-semibold capitalize">{periodLabel}</p>
              <p className="text-xs text-muted-foreground">
                {sessions.length} séance{sessions.length > 1 ? "s" : ""} sur la période
              </p>
            </div>
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={calendarHref(view, nextAnchor)}
                aria-label={view === "week" ? "Semaine suivante" : "Mois suivant"}
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={calendarHref(view, today)}>Aujourd&apos;hui</Link>
            </Button>
          </div>

          <div className="flex w-fit items-center gap-1 rounded-lg border p-1">
            <Link
              href={calendarHref("week", anchor)}
              className={cn(
                buttonVariants({ variant: view === "week" ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              Semaine
            </Link>
            <Link
              href={calendarHref("month", anchor)}
              className={cn(
                buttonVariants({ variant: view === "month" ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              Mois
            </Link>
          </div>
        </CardContent>
      </Card>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <p className="text-sm font-medium">Aucune séance sur cette période</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Générez les séances du mois à partir des horaires hebdomadaires, ou vérifiez les
            horaires de vos groupes.
          </p>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {MONTH_WEEKDAYS.map((label) => (
                <div
                  key={label}
                  className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const daySessions = sessionsByDay.get(day) ?? [];
                const inMonth = isSameMonth(day, anchor);
                const isToday = day === today;

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[124px] border-b border-r p-1.5",
                      index % 7 === 6 && "border-r-0",
                      !inMonth && "bg-muted/20",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between px-0.5">
                      <Link
                        href={calendarHref("week", day)}
                        title="Voir la semaine"
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-muted",
                          isToday && "bg-primary text-primary-foreground hover:bg-primary",
                          !inMonth && "text-muted-foreground/60",
                        )}
                      >
                        {dayNumber(day)}
                      </Link>
                      {daySessions.length > 0 ? (
                        <span className="text-[0.65rem] text-muted-foreground">
                          {daySessions.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      {daySessions.map((session) => (
                        <SessionChip key={session.id} session={session} compact />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-7">
          {days.map((day) => {
            const daySessions = sessionsByDay.get(day) ?? [];
            const isToday = day === today;

            return (
              <div
                key={day}
                className={cn(
                  "rounded-xl border bg-card",
                  isToday && "border-primary/40 ring-1 ring-primary/15",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between border-b px-2.5 py-2",
                    isToday && "bg-primary/5",
                  )}
                >
                  <div>
                    <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                      {WEEKDAY_SHORT_LABELS[dayOfWeek(day)]}
                    </p>
                    <p
                      className={cn(
                        "text-lg leading-tight font-semibold tabular-nums",
                        isToday && "text-primary",
                      )}
                    >
                      {dayNumber(day)}
                    </p>
                  </div>
                  <Link
                    href={`/sessions?view=month&date=${day}`}
                    className="text-[0.65rem] text-muted-foreground hover:text-primary"
                  >
                    Mois
                  </Link>
                </div>

                <div className="min-h-20 space-y-1.5 p-1.5">
                  {daySessions.length > 0 ? (
                    daySessions.map((session) => (
                      <SessionChip key={session.id} session={session} />
                    ))
                  ) : (
                    <p className="px-1 py-3 text-center text-[0.7rem] text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
