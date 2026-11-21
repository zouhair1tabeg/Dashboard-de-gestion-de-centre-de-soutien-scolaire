export type SessionStatusValue =
  | "PLANNED"
  | "DONE"
  | "POSTPONED"
  | "CANCELLED"
  | "RESCHEDULED";

export type SessionView = {
  id: string;
  groupId: string;
  groupName: string;
  subjectName: string;
  levelName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SessionStatusValue;
  replacementDate: string | null;
  note: string | null;
  attendanceCount: number;
};

export type GroupOption = {
  id: string;
  label: string;
};

export type ScheduleView = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type GroupScheduleView = {
  id: string;
  name: string;
  subjectName: string;
  levelName: string;
  enrolledCount: number;
  schedules: ScheduleView[];
};

export type RosterStudent = {
  id: string;
  fullName: string;
  phone: string;
  status: "PRESENT" | "ABSENT" | null;
};

export const SESSION_STATUS_META: Record<
  SessionStatusValue,
  { label: string; badgeClass: string; chipClass: string }
> = {
  PLANNED: {
    label: "Planifiée",
    badgeClass: "border-primary/20 bg-primary/10 text-primary",
    chipClass: "border-primary/20 bg-primary/5 hover:bg-primary/10",
  },
  DONE: {
    label: "Effectuée",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    chipClass: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
  },
  RESCHEDULED: {
    label: "Décalée",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    chipClass: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  },
  POSTPONED: {
    label: "Reportée",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    chipClass: "border-sky-200 bg-sky-50 hover:bg-sky-100",
  },
  CANCELLED: {
    label: "Annulée",
    badgeClass: "border-destructive/20 bg-destructive/5 text-destructive",
    chipClass: "border-dashed border-border bg-muted/40 text-muted-foreground hover:bg-muted",
  },
};
