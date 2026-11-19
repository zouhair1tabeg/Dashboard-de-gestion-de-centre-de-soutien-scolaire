import { BookOpen, Pencil, Plus, Trash2, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import {
  DeleteAcademicDialog,
  GroupFormDialog,
  LevelFormDialog,
  SubjectFormDialog,
} from "./subject-dialogs";
import { fillRate, type SubjectData } from "./types";

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

function typeLabel(type: SubjectData["type"]): string {
  return type === "SCHOOL" ? "Matière scolaire" : "Langue";
}

function fillClass(percent: number): string {
  if (percent >= 100) {
    return "[&_[data-slot=progress-indicator]]:bg-destructive";
  }

  if (percent >= 80) {
    return "[&_[data-slot=progress-indicator]]:bg-amber-500";
  }

  return "";
}

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      levels: {
        orderBy: { name: "asc" },
        include: {
          groups: {
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: {
                  enrollments: { where: { isActive: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const totalGroups = subjects.reduce(
    (total, subject) =>
      total + subject.levels.reduce((levelTotal, level) => levelTotal + level.groups.length, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matières & Groupes"
        description={`${subjects.length} matière${subjects.length > 1 ? "s" : ""} · ${totalGroups} groupe${totalGroups > 1 ? "s" : ""}`}
        actions={
          <SubjectFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Nouvelle matière
              </Button>
            }
          />
        }
      />

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Aucune matière</p>
              <p className="text-sm text-muted-foreground">
                Commencez par créer une matière, puis ajoutez ses niveaux et ses groupes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader className="border-b px-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{subject.name}</CardTitle>
                      <Badge variant="secondary">{typeLabel(subject.type)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {subject.levels.length} niveau{subject.levels.length > 1 ? "x" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <LevelFormDialog
                      subjectId={subject.id}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Plus className="size-3.5" />
                          Niveau
                        </Button>
                      }
                    />
                    <SubjectFormDialog
                      subject={{ id: subject.id, name: subject.name, type: subject.type }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Modifier ${subject.name}`}
                          title="Modifier la matière"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <DeleteAcademicDialog
                      kind="subject"
                      id={subject.id}
                      name={subject.name}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Supprimer ${subject.name}`}
                          title="Supprimer la matière"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-5 pt-4">
                {subject.levels.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucun niveau pour cette matière.
                  </p>
                ) : (
                  subject.levels.map((level) => (
                    <div key={level.id} className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{level.name}</h3>
                          <Badge variant="outline">
                            {level.groups.length} groupe{level.groups.length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <LevelFormDialog
                            subjectId={subject.id}
                            level={{ id: level.id, name: level.name }}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Modifier ${level.name}`}
                                title="Modifier le niveau"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <DeleteAcademicDialog
                            kind="level"
                            id={level.id}
                            name={level.name}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Supprimer ${level.name}`}
                                title="Supprimer le niveau"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {level.groups.map((group) => {
                          const percent = fillRate(group._count.enrollments, group.capacity);

                          return (
                            <div
                              key={group.id}
                              className="rounded-lg border bg-card p-3.5 shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="truncate text-sm font-medium">{group.name}</p>
                                    {!group.isActive ? (
                                      <Badge variant="outline" className="text-muted-foreground">
                                        Inactif
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {formatCurrency(group.monthlyFee)} / mois
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <GroupFormDialog
                                    levelId={level.id}
                                    group={{
                                      id: group.id,
                                      name: group.name,
                                      monthlyFee: group.monthlyFee.toString(),
                                      capacity: group.capacity,
                                      isActive: group.isActive,
                                    }}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Modifier ${group.name}`}
                                        title="Modifier le groupe"
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    }
                                  />
                                  <DeleteAcademicDialog
                                    kind="group"
                                    id={group.id}
                                    name={`${level.name} · ${group.name}`}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Supprimer ${group.name}`}
                                        title="Supprimer le groupe"
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    }
                                  />
                                </div>
                              </div>

                              <div className="mt-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="size-3.5" />
                                    {group._count.enrollments} / {group.capacity} inscrits
                                  </span>
                                  <span
                                    className={
                                      percent >= 100
                                        ? "font-medium text-destructive"
                                        : percent >= 80
                                          ? "font-medium text-amber-600"
                                          : "text-muted-foreground"
                                    }
                                  >
                                    {formatPercent(percent)}
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(percent, 100)}
                                  className={`h-1.5 ${fillClass(percent)}`}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <GroupFormDialog
                          levelId={level.id}
                          trigger={
                            <button
                              type="button"
                              className="flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            >
                              <Plus className="size-4" />
                              Ajouter un groupe
                            </button>
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
