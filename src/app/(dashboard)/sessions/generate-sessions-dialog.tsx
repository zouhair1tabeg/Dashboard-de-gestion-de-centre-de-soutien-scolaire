"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { generateMonthSessions } from "@/app/(dashboard)/sessions/actions";
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
import { todayInputValue } from "@/lib/format";

import type { GroupOption } from "./types";

export function GenerateSessionsDialog({
  groups,
  trigger,
}: {
  groups: GroupOption[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayInputValue().slice(0, 7));
  const [groupId, setGroupId] = useState("ALL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);

    const result = await generateMonthSessions({
      month,
      groupId: groupId === "ALL" ? undefined : groupId,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.created === 0) {
      toast.info(
        result.existing > 0
          ? "Toutes les séances de ce mois existent déjà."
          : "Aucune séance à générer pour ce mois (aucun créneau ne correspond).",
      );
    } else {
      toast.success(
        `${result.created} séance${result.created > 1 ? "s" : ""} générée${result.created > 1 ? "s" : ""}${
          result.existing > 0
            ? ` · ${result.existing} déjà existante${result.existing > 1 ? "s" : ""}`
            : ""
        }.`,
      );
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Générer les séances d&apos;un mois</DialogTitle>
          <DialogDescription>
            Les séances sont créées à partir des horaires hebdomadaires de chaque groupe. Les
            séances déjà existantes ne sont pas dupliquées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="generate-month">Mois</Label>
            <Input
              id="generate-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Groupes</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les groupes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les groupes</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleGenerate} disabled={pending || !month}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
