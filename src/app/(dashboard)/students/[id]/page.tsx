import {
  ArrowLeft,
  ArrowLeftRight,
  BadgePercent,
  CalendarDays,
  Phone,
  Plus,
  User,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { StudentFormDialog, StudentStatusDialog } from "../student-dialogs";
import type { EnrollmentView, GroupOption } from "../types";
import {
  AddEnrollmentDialog,
  ChangeGroupDialog,
  EditDiscountDialog,
  EndEnrollmentDialog,
} from "./enrollment-dialogs";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
        include: {
          group: {
            select: {
              name: true,
              monthlyFee: true,
              level: { select: { name: true, subject: { select: { name: true } } } },
            },
          },
          _count: { select: { payments: true } },
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

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
      capacity: true,
      monthlyFee: true,
      level: { select: { name: true, subject: { select: { name: true } } } },
      _count: { select: { enrollments: { where: { isActive: true } } } },
    },
  });

  const groupOptions: GroupOption[] = groups.map((group) => ({
    id: group.id,
    subjectName: group.level.subject.name,
    levelName: group.level.name,
    groupName: group.name,
    monthlyFee: group.monthlyFee.toString(),
    capacity: group.capacity,
    enrolled: group._count.enrollments,
    isActive: true,
  }));

  const enrollments: EnrollmentView[] = student.enrollments.map((enrollment) => ({
    id: enrollment.id,
    groupId: enrollment.groupId,
    subjectName: enrollment.group.level.subject.name,
    levelName: enrollment.group.level.name,
    groupName: enrollment.group.name,
    startDate: enrollment.startDate.toISOString(),
    endDate: enrollment.endDate?.toISOString() ?? null,
    discount: enrollment.discount.toString(),
    monthlyFee: enrollment.group.monthlyFee.toString(),
    isActive: enrollment.isActive,
    paymentsCount: enrollment._count.payments,
  }));

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.isActive);
  const pastEnrollments = enrollments.filter((enrollment) => !enrollment.isActive);

  return (
    <div className="space-y-6">
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux élèves
      </Link>

      <PageHeader
        title="Fiche élève"
        description="Coordonnées, inscriptions et remises."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StudentFormDialog
              student={{
                id: student.id,
                fullName: student.fullName,
                phone: student.phone,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
              }}
              trigger={
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
              }
            />
            <StudentStatusDialog
              student={{
                id: student.id,
                fullName: student.fullName,
                isActive: student.isActive,
              }}
              trigger={
                <Button
                  variant={student.isActive ? "ghost" : "secondary"}
                  size="sm"
                  className={student.isActive ? "text-muted-foreground hover:text-destructive" : ""}
                >
                  {student.isActive ? "Archiver" : "Réactiver"}
                </Button>
              }
            />
          </div>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="size-14 shrink-0">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials(student.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{student.fullName}</h2>
                {student.isActive ? (
                  <Badge variant="secondary">Actif</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Archivé
                  </Badge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span className="text-foreground">{student.phone}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4 shrink-0" />
                  Inscrit le <span className="text-foreground">{formatDate(student.registeredAt)}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4 shrink-0" />
                  {student.parentName ?? "Parent non renseigné"}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4 shrink-0" />
                  {student.parentPhone ?? "Téléphone parent non renseigné"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Inscriptions</h2>
            <p className="text-sm text-muted-foreground">
              {activeEnrollments.length} groupe{activeEnrollments.length > 1 ? "s" : ""} actif
              {activeEnrollments.length > 1 ? "s" : ""}
              {pastEnrollments.length > 0
                ? ` · ${pastEnrollments.length} inscription${pastEnrollments.length > 1 ? "s" : ""} terminée${pastEnrollments.length > 1 ? "s" : ""}`
                : ""}
            </p>
          </div>
          <AddEnrollmentDialog
            studentId={student.id}
            groups={groupOptions}
            trigger={
              <Button size="sm" disabled={!student.isActive}>
                <Plus className="size-4" />
                Ajouter un groupe
              </Button>
            }
          />
        </div>

        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Wallet className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Aucune inscription</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez un groupe pour commencer à suivre les paiements de cet élève.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...activeEnrollments, ...pastEnrollments].map((enrollment) => {
              const net = Math.max(
                Number(enrollment.monthlyFee) - Number(enrollment.discount),
                0,
              );

              return (
                <Card key={enrollment.id} className={enrollment.isActive ? "" : "bg-muted/20"}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{enrollment.subjectName}</Badge>
                          <span className="text-sm font-medium">
                            {enrollment.levelName} · {enrollment.groupName}
                          </span>
                          {enrollment.isActive ? (
                            <Badge className="bg-emerald-600/10 text-emerald-700">En cours</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Terminée
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Depuis le {formatDate(enrollment.startDate)}
                          {enrollment.endDate
                            ? ` · jusqu'au ${formatDate(enrollment.endDate)}`
                            : ""}
                        </p>
                        {enrollment.paymentsCount > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {enrollment.paymentsCount} paiement
                            {enrollment.paymentsCount > 1 ? "s" : ""} rattaché
                            {enrollment.paymentsCount > 1 ? "s" : ""} à cette inscription
                          </p>
                        ) : null}
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm">
                          Tarif {formatCurrency(enrollment.monthlyFee)}
                          <span className="text-muted-foreground"> / mois</span>
                        </p>
                        {Number(enrollment.discount) > 0 ? (
                          <p className="text-xs text-emerald-700">
                            Remise {formatCurrency(enrollment.discount)}
                          </p>
                        ) : null}
                        <p className="text-sm font-semibold">Net {formatCurrency(net)} / mois</p>
                      </div>
                    </div>

                    {enrollment.isActive ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                        <ChangeGroupDialog
                          enrollment={enrollment}
                          groups={groupOptions}
                          trigger={
                            <Button variant="outline" size="sm">
                              <ArrowLeftRight className="size-3.5" />
                              Changer de groupe
                            </Button>
                          }
                        />
                        <EditDiscountDialog
                          enrollment={enrollment}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <BadgePercent className="size-3.5" />
                              Remise
                            </Button>
                          }
                        />
                        <EndEnrollmentDialog
                          enrollment={enrollment}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-muted-foreground hover:text-destructive"
                            >
                              Retirer du groupe
                            </Button>
                          }
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
