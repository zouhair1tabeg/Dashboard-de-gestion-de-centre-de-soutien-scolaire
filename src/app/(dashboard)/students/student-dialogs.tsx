"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createStudent, setStudentActive, updateStudent } from "./actions";
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
import { studentInputSchema } from "@/lib/validations/academic";

type StudentFormValues = z.infer<typeof studentInputSchema>;

export type StudentFormData = {
  id: string;
  fullName: string;
  phone: string;
  parentName: string | null;
  parentPhone: string | null;
};

export function StudentFormDialog({
  student,
  trigger,
}: {
  student?: StudentFormData;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(student);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentInputSchema),
    defaultValues: {
      fullName: student?.fullName ?? "",
      phone: student?.phone ?? "",
      parentName: student?.parentName ?? "",
      parentPhone: student?.parentPhone ?? "",
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setServerError(null);

    const result = student
      ? await updateStudent({ id: student.id, ...values })
      : await createStudent(values);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success(student ? "Fiche élève mise à jour." : "Élève ajouté.");
    setOpen(false);
    form.reset(values);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier l'élève" : "Nouvel élève"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Mettez à jour les coordonnées de l'élève."
              : "Ajoutez un élève, puis inscrivez-le à un ou plusieurs groupes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="student-full-name">Nom complet</Label>
            <Input
              id="student-full-name"
              placeholder="Youssef El Amrani"
              aria-invalid={Boolean(form.formState.errors.fullName)}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-phone">Téléphone</Label>
            <Input
              id="student-phone"
              type="tel"
              inputMode="tel"
              placeholder="06 12 34 56 78"
              aria-invalid={Boolean(form.formState.errors.phone)}
              {...form.register("phone")}
            />
            {form.formState.errors.phone ? (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-parent-name">Parent / tuteur</Label>
              <Input
                id="student-parent-name"
                placeholder="Facultatif"
                {...form.register("parentName")}
              />
              {form.formState.errors.parentName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.parentName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-parent-phone">Téléphone du parent</Label>
              <Input
                id="student-parent-phone"
                type="tel"
                inputMode="tel"
                placeholder="Facultatif"
                {...form.register("parentPhone")}
              />
              {form.formState.errors.parentPhone ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.parentPhone.message}
                </p>
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
              {isEditing ? "Enregistrer" : "Ajouter l'élève"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StudentStatusDialog({
  student,
  trigger,
}: {
  student: { id: string; fullName: string; isActive: boolean };
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isArchiving = student.isActive;

  async function handleConfirm() {
    setPending(true);

    const result = await setStudentActive({ id: student.id, isActive: !student.isActive });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isArchiving ? "Élève archivé." : "Élève réactivé.");
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchiving ? "Archiver cet élève ?" : "Réactiver cet élève ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{student.fullName}</span> —{" "}
            {isArchiving
              ? "l'élève ne pourra plus être inscrit à de nouveaux groupes. Ses inscriptions et son historique de paiements sont conservés."
              : "l'élève pourra de nouveau être inscrit à des groupes."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={pending}
            className={
              isArchiving ? "bg-destructive text-white hover:bg-destructive/90" : undefined
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isArchiving ? "Archiver" : "Réactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
