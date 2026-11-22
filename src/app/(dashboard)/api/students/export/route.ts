import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import ExcelJS from "exceljs";

import type { Prisma } from "@/generated/prisma/client";

const exportSchema = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(request: Request) {
  // Route dynamique : lecture de la requête à chaque appel.
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");

    // Validation Zod
    const params = exportSchema.parse({
      q: q || undefined,
      status: status || undefined,
    });

    // Construction des filtres Prisma
    const where: Prisma.StudentWhereInput = {};

    if (params.q) {
      where.OR = [
        { fullName: { contains: params.q, mode: "insensitive" } },
        { phone: { contains: params.q } },
        { parentPhone: { contains: params.q } },
      ];
    }

    if (params.status) {
      where.isActive = params.status === "active";
    }

    // Récupération des étudiants avec inscriptions et groupes
    const students = await prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: {
            group: {
              include: {
                level: {
                  include: { subject: true },
                },
              },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    // Création du classeur Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Élèves");

    // Titre de la feuille (ligne 1)
    worksheet.getRow(1).values = ["Liste des élèves"];
    worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    // En-têtes de colonnes (ligne 2)
    const headers = [
      "Nom complet",
      "Téléphone",
      "Téléphone parent",
      "Groupes",
      "Date d'inscription",
      "Statut",
    ];
    worksheet.getRow(2).values = headers;
    worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };

    // Données
    students.forEach((student) => {
      // Groupes suivis (matière · niveau · groupe)
      const groups = student.enrollments
        .filter((enrollment) => enrollment.isActive)
        .map(
          (enrollment) =>
            `${enrollment.group.level.subject.name} · ${enrollment.group.level.name} · ${enrollment.group.name}`,
        )
        .join(", ");

      // Format date d'inscription
      let registeredAtFormatted = "";
      if (student.registeredAt) {
        const date = new Date(student.registeredAt);
        registeredAtFormatted =
          `${String(date.getDate()).padStart(2, "0")}/` +
          `${String(date.getMonth() + 1).padStart(2, "0")}/` +
          `${date.getFullYear()}`;
      }

      // Statut
      const statusFr = student.isActive ? "Actif" : "Inactif";

      const rowData = [
        student.fullName || "",
        student.phone || "",
        student.parentPhone || "",
        groups,
        registeredAtFormatted,
        statusFr,
      ];

      worksheet.addRow(rowData);
    });

    // Geler la première ligne
    worksheet.views = [{
      state: "frozen",
      ySplit: 2,
    }];

    // Activer les filtres automatiques
    worksheet.autoFilter = {
      from: "A2",
      to: `F${students.length + 2}`,
    };

    // Compter par statut
    const activeCount = students.filter((student) => student.isActive).length;
    const inactiveCount = students.filter((student) => !student.isActive).length;

    // Ligne de totaux en bas
    const totalRowIndex = students.length + 4;

    // Ajouter les totaux
    worksheet.getRow(totalRowIndex).values = [
      "TOTAUX",
      `${students.length} élève(s)`,
      "",
      "",
      `${activeCount} actifs, ${inactiveCount} inactifs`,
      "",
    ];

    // Style de la ligne de totaux
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.font = { bold: true };

    // Ajustement de la largeur des colonnes
    worksheet.columns.forEach((col, colIdx) => {
      let maxLen = headers[colIdx]?.length || 10;
      worksheet.eachRow((row, rowNum) => {
        if (rowNum >= 2 && rowNum <= totalRowIndex) {
          const val = row.getCell(colIdx + 1).value;
          if (val) {
            const strVal = String(val);
            if (strVal.length > maxLen) maxLen = strVal.length;
          }
        }
      });
      col.width = Math.max(maxLen + 3, 12);
    });

    // Génération du fichier Excel dans un buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // En-têtes de réponse
    const filename = `eleves-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erreur export Excel étudiants:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Erreur de validation" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de l'exportation" },
      { status: 500 }
    );
  }
}