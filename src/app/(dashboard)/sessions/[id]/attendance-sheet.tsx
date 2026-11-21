"use client";

import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { markAllPresent, saveAttendance } from "@/app/(dashboard)/sessions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { RosterStudent } from "../types";

type AttendanceChoice = "PRESENT" | "ABSENT";

export function AttendanceSheet({
  sessionId,
  students,
  readOnly,
}: {
  sessionId: string;
  students: RosterStudent[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, AttendanceChoice | null>>(() =>
    Object.fromEntries(students.map((student) => [student.id, student.status])),
  );
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [allPending, setAllPending] = useState(false);

  const total = students.length;
  const present = students.filter((student) => statuses[student.id] === "PRESENT").length;
  const absent = students.filter((student) => statuses[student.id] === "ABSENT").length;
  const unmarked = total - present - absent;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;
  const disabled = readOnly || total === 0;

  async function setAttendance(studentId: string, status: AttendanceChoice) {
    if (disabled || pendingIds[studentId]) return;

    const previous = statuses[studentId] ?? null;

    setStatuses((current) => ({ ...current, [studentId]: status }));
    setPendingIds((current) => ({ ...current, [studentId]: true }));

    const result = await saveAttendance({ sessionId, studentId, status });

    setPendingIds((current) => ({ ...current, [studentId]: false }));

    if (!result.ok) {
      setStatuses((current) => ({ ...current, [studentId]: previous }));
      toast.error(result.error);
    }
  }

  async function handleMarkAllPresent() {
    if (disabled || allPending) return;

    const previous = statuses;
    const next: Record<string, AttendanceChoice> = {};

    for (const student of students) {
      next[student.id] = "PRESENT";
    }

    setStatuses(next);
    setAllPending(true);

    const result = await markAllPresent({ sessionId });

    setAllPending(false);

    if (!result.ok) {
      setStatuses(previous);
      toast.error(result.error);
      return;
    }

    toast.success(
      result.marked > 0
        ? `${result.marked} élève${result.marked > 1 ? "s" : ""} marqué${result.marked > 1 ? "s" : ""} présent${result.marked > 1 ? "s" : ""}.`
        : "Tous les élèves sont déjà pointés présents.",
    );
    router.refresh();
  }

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucun élève n&apos;était inscrit à ce groupe à la date de la séance.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {present} / {total} présent{present > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {absent} absent{absent > 1 ? "s" : ""} · {unmarked} non pointé
                {unmarked > 1 ? "s" : ""}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleMarkAllPresent}
              disabled={disabled || allPending}
              className="hidden sm:inline-flex"
            >
              {allPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
              Tous présents
            </Button>
          </div>
          <Progress value={percent} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {students.map((student) => {
          const status = statuses[student.id] ?? null;
          const pending = Boolean(pendingIds[student.id]);

          return (
            <div
              key={student.id}
              className={cn(
                "rounded-xl border bg-card p-3 transition-colors",
                status === "PRESENT" && "border-emerald-200 bg-emerald-50/40",
                status === "ABSENT" && "border-destructive/20 bg-destructive/5",
              )}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground">{student.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={status === "PRESENT"}
                    disabled={disabled || pending}
                    onClick={() => void setAttendance(student.id, "PRESENT")}
                    className={cn(
                      "h-10 justify-center px-3",
                      status === "PRESENT" &&
                        "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white",
                    )}
                  >
                    {pending && status === "PRESENT" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Présent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={status === "ABSENT"}
                    disabled={disabled || pending}
                    onClick={() => void setAttendance(student.id, "ABSENT")}
                    className={cn(
                      "h-10 justify-center px-3",
                      status === "ABSENT" &&
                        "border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white",
                    )}
                  >
                    {pending && status === "ABSENT" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    Absent
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <Button
          type="button"
          onClick={handleMarkAllPresent}
          disabled={disabled || allPending}
          className="w-full"
          size="lg"
        >
          {allPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
          Tous présents ({present}/{total})
        </Button>
      </div>
    </div>
  );
}
