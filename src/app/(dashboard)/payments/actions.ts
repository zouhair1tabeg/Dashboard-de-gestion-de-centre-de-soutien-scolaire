"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { serializePayment, serializeEnrollment, serializeGroup, serializeStudent, serializeLevel, serializeSubject } from "@/lib/serialize";

const UNAUTHORIZED_MESSAGE = "Votre session a expiré. Veuillez vous reconnecter.";

export type GeneratePaymentsResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

export type PaymentActionResult =
  | { ok: true; payment: any }
  | { ok: false; error: string };

/**
 * Génère automatiquement les paiements mensuels pour tous les groupes actifs.
 * Toutes les valeurs Decimal sont converties en number via serializePayment
 * avant tout retour vers le client (même si les calculs internes utilisent Number()).
 */
export async function generateMonthlyPayments(month: string): Promise<GeneratePaymentsResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  // Regex Simple pour YYYY-MM
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { ok: false, error: "Mois invalide." };
  }

  try {
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      include: {
        level: {
          select: { subject: { select: { name: true } }, name: true },
        },
        enrollments: {
          where: { isActive: true },
          include: { student: { select: { fullName: true } } },
        },
      },
    });

    let created = 0;
    let skipped = 0;

    for (const group of groups) {
      const monthlyFee = Number(group.monthlyFee);

      for (const enrollment of group.enrollments) {
        const existing = await prisma.payment.findFirst({
          where: {
            enrollmentId: enrollment.id,
            month,
          },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        const discount = Number(enrollment.discount);
        const amountDue = Math.max(0, monthlyFee - discount);

        await prisma.payment.create({
          data: {
            enrollmentId: enrollment.id,
            month,
            amountDue,
            amountPaid: 0,
            status: "UNPAID",
            note: `Cotisation mensuelle - ${group.level.subject.name} ${group.level.name} · ${group.name}`,
          },
        });

        created += 1;
      }
    }

    revalidatePath("/payments");

    return { ok: true, created, skipped };
  } catch (error) {
    console.error("Erreur génération paiements:", error);
    return { ok: false, error: "Erreur serveur lors de la génération." };
  }
}

/**
 * Enregistre un paiement.
 * Les champs amountDue, amountPaid sont calculés en nombre avant création MAIS
 * le résultat renvoyé au client passe par serializePayment.
 */
export async function recordPayment(
  enrollmentId: string,
  month: string,
  amount: number,
  note?: string
): Promise<PaymentActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: { select: { monthlyFee: true } } },
    });

    if (!enrollment) return { ok: false, error: "Inscription introuvable." };

    const existing = await prisma.payment.findFirst({
      where: { enrollmentId, month },
    });

    let amountPaid = 0;
    let status: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";

    if (existing) {
      amountPaid = Number(existing.amountPaid) + amount;
      const due = Number(existing.amountDue);
      if (amountPaid >= due) status = "PAID";
      else if (amountPaid > 0) status = "PARTIAL";

      await prisma.payment.update({
        where: { id: existing.id },
        data: {
          amountPaid,
          status,
          paidAt: status === "PAID" ? new Date() : existing.paidAt,
          note: note ? (existing.note ? `${existing.note}\n${note}` : note) : existing.note,
        },
      });
    } else {
      const due = Math.max(0, Number(enrollment.group.monthlyFee) - Number(enrollment.discount));
      amountPaid = amount;
      if (amountPaid >= due) status = "PAID";
      else if (amountPaid > 0) status = "PARTIAL";

      await prisma.payment.create({
        data: {
          enrollmentId,
          month,
          amountDue: due,
          amountPaid,
          status,
          paidAt: status === "PAID" ? new Date() : null,
          note,
        },
      });
    }

    revalidatePath("/payments");
    return { ok: true, payment: { ok: true } };
  } catch (error) {
    console.error("Erreur recordPayment:", error);
    return { ok: false, error: "Erreur serveur." };
  }
}

/**
 * Récupère les paiements filtrés.
 * Les objets Decimal sont sérialisés via serializePayment avant d'être retournés
 * au Client Component pour éviter l'erreur "Decimal objects are not supported".
 */
export async function getPayments(filters: {
  month?: string;
  status?: string;
  groupId?: string;
  subjectId?: string;
}) {
  const where: any = {};
  if (filters.month) where.month = filters.month;
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.groupId) where.enrollment = { groupId: filters.groupId };
  if (filters.subjectId) {
    where.enrollment = {
      group: { level: { subjectId: filters.subjectId } },
    };
  }

  try {
    const payments = await prisma.payment.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: { select: { fullName: true, phone: true } },
            group: {
              include: {
                level: {
                  include: { subject: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: [{ month: "desc" }, { enrollment: { student: { fullName: "asc" } } }],
    });

    // Sérialiser chaque paiement avant de le renvoyer au Client Component
    const serializedPayments = payments.map(serializePayment);

    return { ok: true, payments: serializedPayments, total: serializedPayments.length };
  } catch (error) {
    console.error("Erreur getPayments:", error);
    return { ok: false, error: "Erreur serveur.", payments: [] };
  }
}