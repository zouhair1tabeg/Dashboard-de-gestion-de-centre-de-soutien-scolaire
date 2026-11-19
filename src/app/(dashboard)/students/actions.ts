"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { actionError, unexpectedError, validationError, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth-guard";
import { todayInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import {
  changeGroupInputSchema,
  endEnrollmentSchema,
  enrollmentDiscountSchema,
  enrollmentInputSchema,
  idSchema,
  normalizeMoney,
  parseDateInput,
  studentActiveSchema,
  studentInputSchema,
} from "@/lib/validations/academic";

const unauthorized = actionError("Votre session a expiré. Veuillez vous reconnecter.");

const updateStudentSchema = studentInputSchema.extend({ id: idSchema });

class BusinessError extends Error {}

function refreshStudents(studentId?: string) {
  revalidatePath("/students");
  revalidatePath("/subjects");

  if (studentId) {
    revalidatePath(`/students/${studentId}`);
  }
}

async function loadActiveGroup(client: Prisma.TransactionClient, groupId: string) {
  const group = await client.group.findUnique({
    where: { id: groupId },
    select: { id: true, isActive: true, capacity: true, monthlyFee: true },
  });

  if (!group) {
    throw new BusinessError("Le groupe sélectionné n'existe plus.");
  }

  if (!group.isActive) {
    throw new BusinessError("Ce groupe est désactivé. Choisissez un groupe actif.");
  }

  return group;
}

async function assertCapacity(client: Prisma.TransactionClient, groupId: string, capacity: number) {
  const activeCount = await client.enrollment.count({
    where: { groupId, isActive: true },
  });

  if (activeCount >= capacity) {
    throw new BusinessError("Ce groupe est complet. Choisissez un autre groupe.");
  }
}

function assertDiscountWithinFee(discount: number, monthlyFee: Prisma.Decimal) {
  if (discount > Number(monthlyFee.toString())) {
    throw new BusinessError("La remise ne peut pas dépasser le tarif mensuel du groupe.");
  }
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function createStudent(
  input: z.infer<typeof studentInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = studentInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.student.create({
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        parentName: optionalText(parsed.data.parentName),
        parentPhone: optionalText(parsed.data.parentPhone),
      },
    });
    refreshStudents();

    return { ok: true };
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function updateStudent(
  input: z.infer<typeof updateStudentSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { id, ...data } = parsed.data;

  try {
    await prisma.student.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        parentName: optionalText(data.parentName),
        parentPhone: optionalText(data.parentPhone),
      },
    });
    refreshStudents(id);

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cet élève n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function setStudentActive(
  input: z.infer<typeof studentActiveSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = studentActiveSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.student.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.isActive },
    });
    refreshStudents(parsed.data.id);

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cet élève n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function createEnrollment(
  input: z.infer<typeof enrollmentInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = enrollmentInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { studentId, groupId, startDate, discount } = parsed.data;
  const discountValue = Number(normalizeMoney(discount));

  try {
    await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: { isActive: true },
      });

      if (!student) {
        throw new BusinessError("Cet élève n'existe plus.");
      }

      if (!student.isActive) {
        throw new BusinessError("Cet élève est archivé. Réactivez-le avant d'ajouter un groupe.");
      }

      const group = await loadActiveGroup(tx, groupId);
      const alreadyEnrolled = await tx.enrollment.findFirst({
        where: { studentId, groupId, isActive: true },
        select: { id: true },
      });

      if (alreadyEnrolled) {
        throw new BusinessError("Cet élève est déjà inscrit dans ce groupe.");
      }

      assertDiscountWithinFee(discountValue, group.monthlyFee);
      await assertCapacity(tx, groupId, group.capacity);

      await tx.enrollment.create({
        data: {
          studentId,
          groupId,
          startDate: parseDateInput(startDate),
          discount: discountValue.toFixed(2),
          isActive: true,
        },
      });
    });
    refreshStudents(studentId);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}

export async function changeEnrollmentGroup(
  input: z.infer<typeof changeGroupInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = changeGroupInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { enrollmentId, targetGroupId, startDate, discount } = parsed.data;
  const discountValue = Number(normalizeMoney(discount));

  try {
    const studentId = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          id: true,
          studentId: true,
          groupId: true,
          isActive: true,
          student: { select: { isActive: true } },
        },
      });

      if (!enrollment) {
        throw new BusinessError("Cette inscription n'existe plus.");
      }

      if (!enrollment.isActive) {
        throw new BusinessError("Cette inscription est déjà terminée.");
      }

      if (enrollment.groupId === targetGroupId) {
        throw new BusinessError("L'élève est déjà inscrit dans ce groupe.");
      }

      if (!enrollment.student.isActive) {
        throw new BusinessError("Cet élève est archivé. Réactivez-le avant de changer de groupe.");
      }

      const targetGroup = await loadActiveGroup(tx, targetGroupId);
      const alreadyEnrolled = await tx.enrollment.findFirst({
        where: { studentId: enrollment.studentId, groupId: targetGroupId, isActive: true },
        select: { id: true },
      });

      if (alreadyEnrolled) {
        throw new BusinessError("Cet élève est déjà inscrit dans ce groupe.");
      }

      assertDiscountWithinFee(discountValue, targetGroup.monthlyFee);
      await assertCapacity(tx, targetGroupId, targetGroup.capacity);

      const changeDate = parseDateInput(startDate);

      // L'ancienne inscription est clôturée : ses paiements restent rattachés
      // à son historique. Une nouvelle inscription démarre dans le groupe cible.
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { isActive: false, endDate: changeDate },
      });

      await tx.enrollment.create({
        data: {
          studentId: enrollment.studentId,
          groupId: targetGroupId,
          startDate: changeDate,
          discount: discountValue.toFixed(2),
          isActive: true,
        },
      });

      return enrollment.studentId;
    });
    refreshStudents(studentId);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}

export async function updateEnrollmentDiscount(
  input: z.infer<typeof enrollmentDiscountSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = enrollmentDiscountSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const discountValue = Number(normalizeMoney(parsed.data.discount));

  try {
    const studentId = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: parsed.data.enrollmentId },
        select: {
          studentId: true,
          isActive: true,
          group: { select: { monthlyFee: true } },
        },
      });

      if (!enrollment) {
        throw new BusinessError("Cette inscription n'existe plus.");
      }

      if (!enrollment.isActive) {
        throw new BusinessError("Cette inscription est terminée. Sa remise ne peut plus être modifiée.");
      }

      assertDiscountWithinFee(discountValue, enrollment.group.monthlyFee);

      await tx.enrollment.update({
        where: { id: parsed.data.enrollmentId },
        data: { discount: discountValue.toFixed(2) },
      });

      return enrollment.studentId;
    });
    refreshStudents(studentId);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}

export async function endEnrollment(
  input: z.infer<typeof endEnrollmentSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = endEnrollmentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const studentId = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: parsed.data.enrollmentId },
        select: { studentId: true, isActive: true },
      });

      if (!enrollment) {
        throw new BusinessError("Cette inscription n'existe plus.");
      }

      if (!enrollment.isActive) {
        throw new BusinessError("Cette inscription est déjà terminée.");
      }

      // Aucun paiement n'est supprimé : l'inscription est seulement clôturée.
      await tx.enrollment.update({
        where: { id: parsed.data.enrollmentId },
        data: { isActive: false, endDate: parseDateInput(todayInputValue()) },
      });

      return enrollment.studentId;
    });
    refreshStudents(studentId);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}
