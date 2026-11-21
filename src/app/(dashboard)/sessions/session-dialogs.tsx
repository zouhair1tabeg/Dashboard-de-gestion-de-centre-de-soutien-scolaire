"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { updateSession } from "@/app/(dashboard)/sessions/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDays, formatLongDate } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SESSION_STATUS_META, type SessionView } from "./types";

type ActionMode = "view" | "reschedule" | "postpone" | "cancel";

function SessionChipButton({
  session,
  compact,
  className,
  ...props
}: {
  session: SessionView;
  compact?: boolean;
} & ComponentProps<"button">) {
  const meta = SESSION_STATUS_META[session.status];

  return (
    <button
      type="button"
      {...props}
      title={`${session.subjectName} · ${session.levelName} · ${session.groupName} · ${session.startTime} – ${session.endTime}`}
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
        meta.chipClass,
        session.status === "CANCELLED" && "opacity-75",
        className,
      )}
    >
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "font-semibold tabular-nums",
            session.status === "CANCELLED" && "line-through",
          )}
        >
          {session.startTime}
        </span>
        <span className="min-w-0 truncate text-muted-foreground">{session.groupName}</span>
      </span>
      {!compact ? (
        <span className="mt-0.5 block truncate text-[0.7rem] text-muted-foreground">
          {session.subjectName}
        </span>
      ) : null}
      {session.replacementDate ? (
        <span className="mt-0.5 flex items-center gap-1 text-[0.68rem] text-sky-700">
          <ArrowRight className="size-3" />
          Reportée du {formatDate(session.date)}
        </span>
      ) : null}
    </button>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function SessionActionsDialog({
  session,
  compact,
}: {
  session: SessionView;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ActionMode>("view");
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [replacementDate, setReplacementDate] = useState(
    session.replacementDate ?? addDays(session.date, 1),
  );
  const [note, setNote] = useState(session.note ?? "");

  const meta = SESSION_STATUS_META[session.status];
  const isLockedByStatus = mode !== "view";

  function resetForm(nextMode: ActionMode) {
    setMode(nextMode);
    setServerError(null);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setReplacementDate(session.replacementDate ?? addDays(session.date, 1));
    setNote(session.note ?? "");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm("view");
    }
  }

  async function submitReschedule() {
    if (!startTime || !endTime) {
      setServerError("Renseignez les heures de début et de fin.");
      return;
    }

    if (endTime <= startTime) {
      setServerError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setPending(true);
    setServerError(null);
    const result = await updateSession({
      action: "RESCHEDULE",
      sessionId: session.id,
      startTime,
      endTime,
      note: note || undefined,
    });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Séance décalée.");
    setOpen(false);
    router.refresh();
  }

  async function submitPostpone() {
    if (!replacementDate) {
      setServerError("Renseignez la nouvelle date.");
      return;
    }

    setPending(true);
    setServerError(null);
    const result = await updateSession({
      action: "POSTPONE",
      sessionId: session.id,
      replacementDate,
      note: note || undefined,
    });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Séance reportée.");
    setOpen(false);
    router.refresh();
  }

  async function submitCancel() {
    setPending(true);
    setServerError(null);
    const result = await updateSession({
      action: "CANCEL",
      sessionId: session.id,
      note: note || undefined,
    });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Séance annulée.");
    setOpen(false);
    router.refresh();
  }

  async function restore() {
    setPending(true);
    setServerError(null);
    const result = await updateSession({ action: "RESTORE", sessionId: session.id });
    setPending(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Séance rétablie.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <SessionChipButton session={session} compact={compact} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {session.subjectName} · {session.levelName}
          </DialogTitle>
          <DialogDescription>
            {session.groupName} · {formatLongDate(session.replacementDate ?? session.date)} ·{" "}
            {session.startTime} – {session.endTime}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={meta.badgeClass}>
            {meta.label}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCheck className="size-3" />
            {session.attendanceCount} présent{session.attendanceCount > 1 ? "s" : ""}
          </Badge>
          {session.replacementDate ? (
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
              <CalendarClock className="size-3" />
              Séance du {formatDate(session.date)}
            </Badge>
          ) : null}
        </div>

        {session.note ? (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {session.note}
          </p>
        ) : null}

        <FormError message={serverError} />

        {mode === "view" ? (
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button asChild variant="outline">
              <Link href={`/sessions/${session.id}`}>
                <CheckCheck className="size-4" />
                Feuille d&apos;appel
              </Link>
            </Button>

            {session.status === "DONE" ? (
              <p className="text-xs text-muted-foreground">
                Séance effectuée : elle ne peut plus être modifiée.
              </p>
            ) : session.status === "CANCELLED" || session.status === "POSTPONED" ? (
              <Button type="button" onClick={restore} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Rétablir
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => resetForm("reschedule")}>
                  <CalendarDays className="size-4" />
                  Décaler
                </Button>
                <Button type="button" variant="outline" onClick={() => resetForm("postpone")}>
                  <CalendarClock className="size-4" />
                  Reporter
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => resetForm("cancel")}
                >
                  <XCircle className="size-4" />
                  Annuler
                </Button>
              </div>
            )}
          </DialogFooter>
        ) : null}

        {isLockedByStatus ? (
          <div className="space-y-3">
            {mode === "reschedule" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-start">Nouvelle heure de début</Label>
                  <Input
                    id="session-start"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-end">Nouvelle heure de fin</Label>
                  <Input
                    id="session-end"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {mode === "postpone" ? (
              <div className="space-y-2">
                <Label htmlFor="session-replacement">Nouvelle date</Label>
                <Input
                  id="session-replacement"
                  type="date"
                  value={replacementDate}
                  onChange={(event) => setReplacementDate(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  La séance sera affichée à la nouvelle date. La date d&apos;origine est conservée
                  pour l&apos;historique.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="session-note">
                Note{mode === "cancel" ? " (motif)" : " (facultative)"}
              </Label>
              <Textarea
                id="session-note"
                rows={2}
                maxLength={300}
                placeholder={
                  mode === "cancel"
                    ? "Ex. absence de l'enseignant"
                    : "Ex. séance déplacée en salle 2"
                }
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetForm("view")}
                disabled={pending}
              >
                Retour
              </Button>
              <Button
                type="button"
                variant={mode === "cancel" ? "destructive" : "default"}
                disabled={pending}
                onClick={() => {
                  if (mode === "reschedule") void submitReschedule();
                  else if (mode === "postpone") void submitPostpone();
                  else void submitCancel();
                }}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "cancel" ? "Confirmer l'annulation" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function SessionChip({
  session,
  compact,
}: {
  session: SessionView;
  compact?: boolean;
}) {
  return (
    <SessionActionsDialog
      key={`${session.id}-${session.status}-${session.startTime}-${session.endTime}-${
        session.replacementDate ?? ""
      }-${session.note ?? ""}-${session.attendanceCount}`}
      session={session}
      compact={compact}
    />
  );
}
