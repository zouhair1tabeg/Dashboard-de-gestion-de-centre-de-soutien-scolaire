import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import ExcelJS from "exceljs";

import type { Prisma } from "@/generated/prisma/client";

const exportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mois au format YYYY-MM").optional(),
  status: z.enum(["UNPAID", "PARTIAL", "PAID", "ALL"]).optional(),
});

export async function GET(request: Request) {
  // Route dynamique : lecture de la requête à chaque appel.
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const status = searchParams.get("status");

    // Validation Zod
    const params = exportSchema.parse({
      month: month || undefined,
      status: status || undefined,
    });

    // Si pas de mois spécifié, c'est une erreur
    if (!params.month) {
      return NextResponse.json(
        { error: "Le paramètre month (YYYY-MM) est obligatoire" },
        { status: 400 }
      );
    }

    // Construction des filtres Prisma (mêmes que la page)
    const where: Prisma.PaymentWhereInput = {
      month: params.month,
    };

    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    // Récupération des paiements avec relations (même requête que la page)
    const payments = await prisma.payment.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: true,
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
      orderBy: [
        { enrollment: { student: { fullName: "asc" } } },
        { month: "asc" },
      ],
    });

    // Création du classeur Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Paiements " + params.month);

    // Titre de la feuille (ligne 1)
    worksheet.getRow(1).values = ["Paiements " + params.month];
    worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    // En-têtes de colonnes (ligne 2)
    const headers = [
      "Élève",
      "Téléphone",
      "Matière",
      "Groupe",
      "Mois",
      "Montant dû",
      "Montant payé",
      "Reste",
      "Statut",
      "Date de paiement",
    ];
    worksheet.getRow(2).values = headers;
    worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };

    // Données
    payments.forEach((p) => {
      const enrolled = p.enrollment || {};
      const student = enrolled.student || {};
      const group = enrolled.group || {};
      const level = group.level || {};
      const subject = level.subject || {};

      // Calcul du reste
      const amountDue = Number(p.amountDue || 0);
      const amountPaid = Number(p.amountPaid || 0);
      const remainder = amountDue - amountPaid;

      // Format date
      let paidAtFormatted = "";
      if (p.paidAt) {
        const date = new Date(p.paidAt);
        paidAtFormatted =
          `${String(date.getDate()).padStart(2, "0")}/` +
          `${String(date.getMonth() + 1).padStart(2, "0")}/` +
          `${date.getFullYear()}`;
      }

      // Statut en français
      const statusFr =
        p.status === "PAID" ? "Payé" : p.status === "PARTIAL" ? "Partiel" : "Impayé";

      // Valeurs de la ligne
      const rowData = [
        student.fullName || "Inconnu",
        student.phone || "",
        subject.name || "",
        group.name || "",
        p.month,
        amountDue,
        amountPaid,
        remainder,
        statusFr,
        paidAtFormatted,
      ];

      // Ajout de la ligne
      worksheet.addRow(rowData);
    });

    // Format des montants en nombres avec DH
    worksheet.getColumn(6).numFmt = '#,##0 "DH"';
    worksheet.getColumn(7).numFmt = '#,##0 "DH"';
    worksheet.getColumn(8).numFmt = '#,##0 "DH"';

    // Format date column
    worksheet.getColumn(10).numFmt = "DD/MM/YYYY";

    // Geler la première ligne (en-tête)
    worksheet.views = [{
      state: "frozen",
      ySplit: 2,
    }];

    // Activer les filtres automatiques sur la ligne d'en-tête (ligne 2)
    worksheet.autoFilter = {
      from: "A2",
      to: `J${payments.length + 2}`,
    };

    // Ajouter une ligne de totaux en bas
    const totalRowIndex = payments.length + 4;
    const totals = payments.reduce(
      (acc: { totalDue: number; totalPaid: number; totalRemainder: number }, p) => {
        const due = Number(p.amountDue || 0);
        const paid = Number(p.amountPaid || 0);
        acc.totalDue += due;
        acc.totalPaid += paid;
        acc.totalRemainder += (due - paid);
        return acc;
      },
      { totalDue: 0, totalPaid: 0, totalRemainder: 0 }
    );

    // Ajouter les totaux
    worksheet.getRow(totalRowIndex).values = [
      "TOTAUX",
      "",
      "",
      "",
      "",
      totals.totalDue,
      totals.totalPaid,
      totals.totalRemainder,
      "",
      "",
    ];

    // Style de la ligne de totaux
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.font = { bold: true };

    // Format nombre pour les totaux
    worksheet.getColumn(6).numFmt = '#,##0 "DH"';
    worksheet.getColumn(7).numFmt = '#,##0 "DH"';
    worksheet.getColumn(8).numFmt = '#,##0 "DH"';

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
    const filename = `paiements-${params.month}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erreur export Excel paiements:", error);
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