import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import { StudentFormDialog } from "./student-dialogs";
import { StudentsFilters } from "./students-filters";
import { StudentsTable } from "./students-table";
import type { StudentRow } from "./types";

const PAGE_SIZE = 10;

// Les données sont chargées à chaque requête (pas de prérendu partiel).
export const instant = false;

const searchParamsSchema = z.object({
  q: z.string().max(100).catch("").default(""),
  status: z.enum(["all", "active", "inactive"]).catch("all").default("all"),
  group: z.string().max(100).catch("").default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = searchParamsSchema.parse({
    q: firstValue(rawParams.q),
    status: firstValue(rawParams.status),
    group: firstValue(rawParams.group),
    page: firstValue(rawParams.page),
  });

  const where: Prisma.StudentWhereInput = {
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q } },
            { parentPhone: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.status === "active" ? { isActive: true } : {}),
    ...(params.status === "inactive" ? { isActive: false } : {}),
    ...(params.group
      ? { enrollments: { some: { isActive: true, groupId: params.group } } }
      : {}),
  };

  const [total, groups] = await Promise.all([
    prisma.student.count({ where }),
    prisma.group.findMany({
      orderBy: [
        { level: { subject: { name: "asc" } } },
        { level: { name: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        isActive: true,
        level: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      enrollments: {
        where: { isActive: true },
        orderBy: { startDate: "asc" },
        select: {
          group: {
            select: {
              name: true,
              level: { select: { name: true, subject: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  const rows: StudentRow[] = students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    phone: student.phone,
    isActive: student.isActive,
    registeredAt: student.registeredAt.toISOString(),
    groupLabels: student.enrollments.map(
      (enrollment) => `${enrollment.group.level.subject.name} · ${enrollment.group.name}`,
    ),
  }));

  const hasFilters = params.q !== "" || params.status !== "all" || params.group !== "";

  function pageHref(targetPage: number): string {
    const query = new URLSearchParams();

    if (params.q) query.set("q", params.q);
    if (params.status !== "all") query.set("status", params.status);
    if (params.group) query.set("group", params.group);
    if (targetPage > 1) query.set("page", String(targetPage));

    const suffix = query.toString();

    return suffix ? `/students?${suffix}` : "/students";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Élèves"
        description="Fiches, coordonnées et inscriptions aux groupes."
        actions={
          <StudentFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Nouvel élève
              </Button>
            }
          />
        }
      />

      <StudentsFilters
        groups={groups.map((group) => ({
          id: group.id,
          label: `${group.level.subject.name} · ${group.level.name} · ${group.name}${
            group.isActive ? "" : " (inactif)"
          }`,
        }))}
        initialQuery={params.q}
        initialStatus={params.status}
        initialGroup={params.group}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">
                {hasFilters ? "Aucun élève ne correspond aux filtres" : "Aucun élève"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Modifiez la recherche ou réinitialisez les filtres."
                  : "Ajoutez un premier élève pour commencer."}
              </p>
            </div>
            {hasFilters ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/students">Réinitialiser les filtres</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <StudentsTable rows={rows} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {total} élève{total > 1 ? "s" : ""} · page {currentPage} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={pageHref(currentPage - 1)}>Précédent</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Précédent
                </Button>
              )}
              {currentPage < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={pageHref(currentPage + 1)}>Suivant</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Suivant
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
