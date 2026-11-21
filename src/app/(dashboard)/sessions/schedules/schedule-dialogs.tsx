"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from "@/app/(dashboard)/sessions/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-result";
import { WEEKDAY_LABELS } from "@/lib/calendar";
import { scheduleInputSchema } from "@/lib/validations/scheduling";

type ScheduleFormValues = z.infer<typeof scheduleInputSchema>;

type ScheduleTarget = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0] as const;

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

export function ScheduleFormDialog({
  groupId,
  schedule,
  trigger,
}: {
  groupId: string;
  schedule?: ScheduleTarget;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(schedule);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleInputSchema),
    defaultValues: {
      groupId,
      dayOfWeek: schedule?.dayOfWeek ?? 6,
      startTime: schedule?.startTime ?? "17:00",
      endTime: schedule?.endTime ?? "19:00",
    },
  });

  async function onSubmit(values: ScheduleFormValues) {
    setServerError(null);

    const result: ActionResult = schedule
      ? await updateSchedule({ id: schedule.id, ...values })
      : await createSchedule(values);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success(schedule ? "Horaire mis à jour." : "Horaire ajouté.");
    setOpen(false);

    if (!schedule) {
      form.reset({ groupId, dayOfWeek: 6, startTime: "17:00", endTime: "19:00" });
    }

    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le créneau" : "Nouveau créneau"}</DialogTitle>
          <DialogDescription>
            Un créneau hebdomadaire est utilisé pour générer les séances du mois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label>Jour de la semaine</Label>
            <Controller
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un jour" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {WEEKDAY_LABELS[day]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-start">Heure de début</Label>
              <Input id="schedule-start" type="time" {...form.register("startTime")} />
              {form.formState.errors.startTime ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startTime.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-end">Heure de fin</Label>
              <Input id="schedule-end" type="time" {...form.register("endTime")} />
              {form.formState.errors.endTime ? (
                <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteScheduleDialog({
  schedule,
  label,
  trigger,
}: {
  schedule: ScheduleTarget;
  label: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);

    const result = await deleteSchedule({ id: schedule.id });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Horaire supprimé.");
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce créneau ?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{label}</span> ne sera plus utilisé pour
            générer les prochaines séances. Les séances déjà générées sont conservées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
