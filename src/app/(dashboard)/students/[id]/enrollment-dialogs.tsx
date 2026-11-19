"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  changeEnrollmentGroup,
  createEnrollment,
  endEnrollment,
  updateEnrollmentDiscount,
} from "../actions";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, todayInputValue } from "@/lib/format";
import {
  changeGroupInputSchema,
  enrollmentDiscountSchema,
  enrollmentInputSchema,
} from "@/lib/validations/academic";

import type { EnrollmentView, GroupOption } from "../types";

const groupSelectionSchema = z.string().min(1, "Veuillez choisir un groupe.");

const addEnrollmentFormSchema = enrollmentInputSchema
  .omit({ studentId: true })
  .extend({ groupId: groupSelectionSchema });
const changeGroupFormSchema = changeGroupInputSchema
  .omit({ enrollmentId: true })
  .extend({ targetGroupId: groupSelectionSchema });
const discountFormSchema = enrollmentDiscountSchema.omit({ enrollmentId: true });

type AddEnrollmentValues = z.infer<typeof addEnrollmentFormSchema>;
type ChangeGroupValues = z.infer<typeof changeGroupFormSchema>;
type DiscountValues = z.infer<typeof discountFormSchema>;

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

function GroupSelect({
  value,
  onChange,
  groups,
  excludeGroupId,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  groups: GroupOption[];
  excludeGroupId?: string;
  invalid?: boolean;
}) {
  const bySubject = new Map<string, GroupOption[]>();

  for (const group of groups) {
    const existing = bySubject.get(group.subjectName) ?? [];
    existing.push(group);
    bySubject.set(group.subjectName, existing);
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder="Choisir un groupe" />
      </SelectTrigger>
      <SelectContent>
        {[...bySubject.entries()].map(([subjectName, options]) => (
          <SelectGroup key={subjectName}>
            <SelectLabel>{subjectName}</SelectLabel>
            {options.map((option) => {
              const isFull = option.enrolled >= option.capacity;
              const isCurrent = option.id === excludeGroupId;

              return (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  disabled={!option.isActive || isFull || isCurrent}
                >
                  {option.levelName} · {option.groupName} — {option.enrolled}/{option.capacity}
                  {isFull ? " · complet" : ""}
                  {isCurrent ? " · actuel" : ""}
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectedGroupInfo({
  groupId,
  groups,
}: {
  groupId: string;
  groups: GroupOption[];
}) {
  const selected = groups.find((group) => group.id === groupId);

  if (!selected) return null;

  return (
    <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      {formatCurrency(selected.monthlyFee)} / mois · {selected.enrolled}/{selected.capacity}{" "}
      inscrits
    </p>
  );
}

export function AddEnrollmentDialog({
  studentId,
  groups,
  trigger,
}: {
  studentId: string;
  groups: GroupOption[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AddEnrollmentValues>({
    resolver: zodResolver(addEnrollmentFormSchema),
    defaultValues: {
      groupId: "",
      startDate: todayInputValue(),
      discount: "0",
    },
  });
  const selectedGroupId = useWatch({ control: form.control, name: "groupId" });

  async function onSubmit(values: AddEnrollmentValues) {
    setServerError(null);

    const result = await createEnrollment({ studentId, ...values });

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Inscription ajoutée.");
    setOpen(false);
    form.reset({ groupId: "", startDate: todayInputValue(), discount: "0" });
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
          <DialogTitle>Ajouter un groupe</DialogTitle>
          <DialogDescription>
            Inscrivez l&apos;élève à un nouveau groupe. Le tarif mensuel dépend du groupe choisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label>Groupe</Label>
            <Controller
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <GroupSelect
                  value={field.value}
                  onChange={field.onChange}
                  groups={groups}
                  invalid={Boolean(form.formState.errors.groupId)}
                />
              )}
            />
            {form.formState.errors.groupId ? (
              <p className="text-xs text-destructive">{form.formState.errors.groupId.message}</p>
            ) : null}
            <SelectedGroupInfo groupId={selectedGroupId} groups={groups} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enrollment-start">Date d&apos;inscription</Label>
              <Input
                id="enrollment-start"
                type="date"
                aria-invalid={Boolean(form.formState.errors.startDate)}
                {...form.register("startDate")}
              />
              {form.formState.errors.startDate ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollment-discount">Remise mensuelle (DH)</Label>
              <Input
                id="enrollment-discount"
                inputMode="decimal"
                placeholder="0"
                aria-invalid={Boolean(form.formState.errors.discount)}
                {...form.register("discount")}
              />
              {form.formState.errors.discount ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.discount.message}
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
              Inscrire
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChangeGroupDialog({
  enrollment,
  groups,
  trigger,
}: {
  enrollment: EnrollmentView;
  groups: GroupOption[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ChangeGroupValues>({
    resolver: zodResolver(changeGroupFormSchema),
    defaultValues: {
      targetGroupId: "",
      startDate: todayInputValue(),
      discount: enrollment.discount,
    },
  });
  const selectedGroupId = useWatch({ control: form.control, name: "targetGroupId" });

  async function onSubmit(values: ChangeGroupValues) {
    setServerError(null);

    const result = await changeEnrollmentGroup({ enrollmentId: enrollment.id, ...values });

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Changement de groupe effectué. L'historique est conservé.");
    setOpen(false);
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
          <DialogTitle>Changer de groupe</DialogTitle>
          <DialogDescription>
            L&apos;inscription actuelle ({enrollment.subjectName} · {enrollment.groupName}) sera
            clôturée et une nouvelle inscription démarrera dans le groupe choisi. Les paiements
            déjà enregistrés restent attachés à l&apos;inscription d&apos;origine.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label>Nouveau groupe</Label>
            <Controller
              control={form.control}
              name="targetGroupId"
              render={({ field }) => (
                <GroupSelect
                  value={field.value}
                  onChange={field.onChange}
                  groups={groups}
                  excludeGroupId={enrollment.groupId}
                  invalid={Boolean(form.formState.errors.targetGroupId)}
                />
              )}
            />
            {form.formState.errors.targetGroupId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.targetGroupId.message}
              </p>
            ) : null}
            <SelectedGroupInfo groupId={selectedGroupId} groups={groups} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="change-date">Date du changement</Label>
              <Input
                id="change-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.startDate)}
                {...form.register("startDate")}
              />
              {form.formState.errors.startDate ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-discount">Remise mensuelle (DH)</Label>
              <Input
                id="change-discount"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.discount)}
                {...form.register("discount")}
              />
              {form.formState.errors.discount ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.discount.message}
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
              Changer de groupe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditDiscountDialog({
  enrollment,
  trigger,
}: {
  enrollment: EnrollmentView;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<DiscountValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: { discount: enrollment.discount },
  });

  async function onSubmit(values: DiscountValues) {
    setServerError(null);

    const result = await updateEnrollmentDiscount({
      enrollmentId: enrollment.id,
      discount: values.discount,
    });

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    toast.success("Remise mise à jour.");
    setOpen(false);
    router.refresh();
  }

  const net = Number(enrollment.monthlyFee) - Number(enrollment.discount);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remise mensuelle</DialogTitle>
          <DialogDescription>
            Tarif du groupe : {formatCurrency(enrollment.monthlyFee)}. La remise ne peut pas
            dépasser ce montant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={serverError} />

          <div className="space-y-2">
            <Label htmlFor="discount-amount">Remise (DH)</Label>
            <Input
              id="discount-amount"
              inputMode="decimal"
              aria-invalid={Boolean(form.formState.errors.discount)}
              {...form.register("discount")}
            />
            {form.formState.errors.discount ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.discount.message}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Net actuel : {formatCurrency(Math.max(net, 0))} / mois
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EndEnrollmentDialog({
  enrollment,
  trigger,
}: {
  enrollment: EnrollmentView;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleEnd() {
    setPending(true);

    const result = await endEnrollment({ enrollmentId: enrollment.id });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Élève retiré du groupe. L'historique des paiements est conservé.");
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer du groupe ?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {enrollment.subjectName} · {enrollment.levelName} · {enrollment.groupName}
            </span>{" "}
            — l&apos;inscription sera clôturée à la date du jour. Aucun paiement n&apos;est
            supprimé : l&apos;historique financier reste accessible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleEnd();
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
