"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createGroup,
  createLevel,
  createSubject,
  deleteGroup,
  deleteLevel,
  deleteSubject,
  updateGroup,
  updateLevel,
  updateSubject,
} from "@/app/(dashboard)/subjects/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/lib/action-result";
import {
  groupInputSchema,
  levelInputSchema,
  subjectInputSchema,
} from "@/lib/validations/academic";

import type { SubjectData, SubjectTypeValue } from "./types";

type SubjectFormValues = z.infer<typeof subjectInputSchema>;
type LevelFormValues = z.infer<typeof levelInputSchema>;
type GroupFormValues = z.infer<typeof groupInputSchema>;

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

function applyServerError(
  result: ActionResult,
  setError: (message: string) => void,
): boolean {
  if (result.ok) return false;

  setError(result.error);
  return true;
}

export function SubjectFormDialog({
  subject,
  trigger,
}: {
  subject?: Pick<SubjectData, "id" | "name" | "type">;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(subject);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectInputSchema),
    defaultValues: {
      name: subject?.name ?? "",
      type: subject?.type ?? "SCHOOL",
    },
  });

  async function onSubmit(values: SubjectFormValues) {
    setServerError(null);

    const result = subject
      ? await updateSubject({ id: subject.id, ...values })
      : await createSubject(values);

    if (applyServerError(result, setServerError)) return;

    toast.success(subject ? "Matière mise à jour." : "Matière créée.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez le nom ou le type de la matière."
              : "Ajoutez une matière scolaire ou une langue."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label htmlFor="subject-name">Nom</Label>
            <Input
              id="subject-name"
              placeholder="Mathématiques"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as SubjectTypeValue)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHOOL">Matière scolaire</SelectItem>
                    <SelectItem value="LANGUAGE">Langue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LevelFormDialog({
  subjectId,
  level,
  trigger,
}: {
  subjectId: string;
  level?: { id: string; name: string };
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(level);

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelInputSchema),
    defaultValues: {
      subjectId,
      name: level?.name ?? "",
    },
  });

  async function onSubmit(values: LevelFormValues) {
    setServerError(null);

    const result = level
      ? await updateLevel({ id: level.id, ...values })
      : await createLevel(values);

    if (applyServerError(result, setServerError)) return;

    toast.success(level ? "Niveau mis à jour." : "Niveau créé.");
    setOpen(false);
    form.reset({ subjectId, name: "" });
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
          <DialogTitle>{isEditing ? "Modifier le niveau" : "Nouveau niveau"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Renommez ce niveau."
              : "Ajoutez un niveau à cette matière (ex. 2ème Bac, B1)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label htmlFor="level-name">Nom du niveau</Label>
            <Input
              id="level-name"
              placeholder="2ème Bac Sciences"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GroupFormDialog({
  levelId,
  group,
  trigger,
}: {
  levelId: string;
  group?: {
    id: string;
    name: string;
    monthlyFee: string;
    capacity: number;
    isActive: boolean;
  };
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(group);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupInputSchema),
    defaultValues: {
      levelId,
      name: group?.name ?? "",
      monthlyFee: group?.monthlyFee ?? "",
      capacity: group ? String(group.capacity) : "",
      isActive: group?.isActive ?? true,
    },
  });

  async function onSubmit(values: GroupFormValues) {
    setServerError(null);

    const result = group
      ? await updateGroup({ id: group.id, ...values })
      : await createGroup(values);

    if (applyServerError(result, setServerError)) return;

    toast.success(group ? "Groupe mis à jour." : "Groupe créé.");
    setOpen(false);
    form.reset({
      levelId,
      name: "",
      monthlyFee: "",
      capacity: "",
      isActive: true,
    });
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
          <DialogTitle>{isEditing ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
          <DialogDescription>
            Définissez le tarif mensuel et la capacité du groupe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label htmlFor="group-name">Nom du groupe</Label>
            <Input
              id="group-name"
              placeholder="Groupe A"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="group-fee">Tarif mensuel (DH)</Label>
              <Input
                id="group-fee"
                inputMode="decimal"
                placeholder="350"
                aria-invalid={Boolean(form.formState.errors.monthlyFee)}
                {...form.register("monthlyFee")}
              />
              {form.formState.errors.monthlyFee ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.monthlyFee.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-capacity">Capacité</Label>
              <Input
                id="group-capacity"
                inputMode="numeric"
                placeholder="20"
                aria-invalid={Boolean(form.formState.errors.capacity)}
                {...form.register("capacity")}
              />
              {form.formState.errors.capacity ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.capacity.message}
                </p>
              ) : null}
            </div>
          </div>

          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="group-active">Groupe actif</Label>
                  <p className="text-xs text-muted-foreground">
                    Un groupe inactif n&apos;accepte plus de nouvelles inscriptions.
                  </p>
                </div>
                <Switch
                  id="group-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DeleteKind = "subject" | "level" | "group";

const deleteContent: Record<DeleteKind, { title: string; description: string }> = {
  subject: {
    title: "Supprimer cette matière ?",
    description:
      "La matière sera définitivement supprimée. Cette opération est impossible si elle contient des niveaux.",
  },
  level: {
    title: "Supprimer ce niveau ?",
    description:
      "Le niveau sera définitivement supprimé. Cette opération est impossible s'il contient des groupes.",
  },
  group: {
    title: "Supprimer ce groupe ?",
    description:
      "Le groupe sera définitivement supprimé. S'il possède des inscriptions ou des séances, désactivez-le plutôt afin de conserver l'historique.",
  },
};

export function DeleteAcademicDialog({
  kind,
  id,
  name,
  trigger,
}: {
  kind: DeleteKind;
  id: string;
  name: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);

    const result =
      kind === "subject"
        ? await deleteSubject({ id })
        : kind === "level"
          ? await deleteLevel({ id })
          : await deleteGroup({ id });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      kind === "subject" ? "Matière supprimée." : kind === "level" ? "Niveau supprimé." : "Groupe supprimé.",
    );
    setOpen(false);
    router.refresh();
  }

  const content = deleteContent[kind];

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content.title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">« {name} »</span> — {content.description}
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
