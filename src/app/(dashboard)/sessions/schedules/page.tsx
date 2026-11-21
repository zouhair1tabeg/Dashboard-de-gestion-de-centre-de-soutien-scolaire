import { ArrowLeft, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weekdayLabel } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

import type { GroupScheduleView } from "../types";
import { DeleteScheduleDialog, ScheduleFormDialog } from "./schedule-dialogs";

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

export default async function SchedulesPage() {
  const groups = await prisma.group.findMany({
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
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      },
      _count: { select: { enrollments: { where: { isActive: true } } } },
    },
  });

  const groupViews: GroupScheduleView[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    subjectName: group.level.subject.name,
    levelName: group.level.name,
    enrolledCount: group._count.enrollments,
    schedules: group.schedules,
  }));

  const totalSlots = groupViews.reduce((total, group) => total + group.schedules.length, 0);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/sessions">
          <ArrowLeft className="size-4" />
          Retour au planning
        </Link>
      </Button>

      <PageHeader
        title="Horaires hebdomadaires"
        description={`${groupViews.length} groupe${groupViews.length > 1 ? "s" : ""} · ${totalSlots} créneau${totalSlots > 1 ? "x" : ""} par semaine`}
        actions={
          <Button asChild variant="outline">
            <Link href="/sessions">
              <CalendarDays className="size-4" />
              Calendrier
            </Link>
          </Button>
        }
      />

      <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Ces créneaux servent de modèle : depuis la page Séances, « Générer les séances » crée les
        séances du mois correspondantes. Les modifications ponctuelles se font ensuite sur chaque
        séance.
      </p>

      {groupViews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun groupe actif. Créez d&apos;abord des groupes dans le module Matières &amp;
            Groupes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupViews.map((group) => (
            <Card key={group.id}>
              <CardHeader className="border-b px-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-sm">
                      {group.subjectName} · {group.levelName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {group.name} · {group.enrolledCount} élève
                      {group.enrolledCount > 1 ? "s" : ""} inscrit
                      {group.enrolledCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {group.schedules.length} créneau{group.schedules.length > 1 ? "x" : ""}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pt-4">
                {group.schedules.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun horaire défini pour ce groupe.
                  </p>
                ) : (
                  group.schedules.map((slot) => {
                    const label = `${weekdayLabel(slot.dayOfWeek)} ${slot.startTime} – ${slot.endTime}`;

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                          <span className="font-medium">{weekdayLabel(slot.dayOfWeek)}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <ScheduleFormDialog
                            groupId={group.id}
                            schedule={slot}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Modifier ${label}`}
                                title="Modifier le créneau"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <DeleteScheduleDialog
                            schedule={slot}
                            label={label}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Supprimer ${label}`}
                                title="Supprimer le créneau"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                <ScheduleFormDialog
                  groupId={group.id}
                  trigger={
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus className="size-3.5" />
                      Ajouter un créneau
                    </button>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
