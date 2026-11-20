"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, unexpectedError, validationError, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import {
  groupInputSchema,
  idSchema,
  levelInputSchema,
  normalizeMoney,
  subjectInputSchema,
} from "@/lib/validations/academic";

const unauthorized = actionError("Votre session a expiré. Veuillez vous reconnecter.");

const updateSubjectSchema = subjectInputSchema.extend({ id: idSchema });
const updateLevelSchema = levelInputSchema.extend({ id: idSchema });
const updateGroupSchema = groupInputSchema.extend({ id: idSchema });
const idOnlySchema = z.object({ id: idSchema });

function refreshSubjects() {
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function createSubject(input: z.infer<typeof subjectInputSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = subjectInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.subject.create({ data: parsed.data });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Une matière porte déjà ce nom.");
    }

    return unexpectedError(error);
  }
}

export async function updateSubject(
  input: z.infer<typeof updateSubjectSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = updateSubjectSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { id, ...data } = parsed.data;

  try {
    await prisma.subject.update({ where: { id }, data });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Une matière porte déjà ce nom.");
    }

    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cette matière n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function deleteSubject(input: z.infer<typeof idOnlySchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const levelCount = await prisma.level.count({ where: { subjectId: parsed.data.id } });

  if (levelCount > 0) {
    return actionError("Cette matière contient des niveaux. Supprimez-les avant de la supprimer.");
  }

  try {
    await prisma.subject.delete({ where: { id: parsed.data.id } });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cette matière n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function createLevel(input: z.infer<typeof levelInputSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = levelInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.level.create({ data: parsed.data });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Ce niveau existe déjà pour cette matière.");
    }

    if (isPrismaErrorCode(error, "P2003")) {
      return actionError("La matière sélectionnée n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function updateLevel(
  input: z.infer<typeof updateLevelSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = updateLevelSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { id, ...data } = parsed.data;

  try {
    await prisma.level.update({ where: { id }, data });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Ce niveau existe déjà pour cette matière.");
    }

    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Ce niveau n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function deleteLevel(input: z.infer<typeof idOnlySchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const groupCount = await prisma.group.count({ where: { levelId: parsed.data.id } });

  if (groupCount > 0) {
    return actionError("Ce niveau contient des groupes. Supprimez-les avant de le supprimer.");
  }

  try {
    await prisma.level.delete({ where: { id: parsed.data.id } });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Ce niveau n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function createGroup(input: z.infer<typeof groupInputSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.group.create({
      data: {
        levelId: parsed.data.levelId,
        name: parsed.data.name,
        monthlyFee: normalizeMoney(parsed.data.monthlyFee),
        capacity: Number(parsed.data.capacity),
        isActive: parsed.data.isActive,
      },
    });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Un groupe porte déjà ce nom pour ce niveau.");
    }

    if (isPrismaErrorCode(error, "P2003")) {
      return actionError("Le niveau sélectionné n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function updateGroup(
  input: z.infer<typeof updateGroupSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { id, ...data } = parsed.data;
  const capacity = Number(data.capacity);

  // On ne peut pas réduire la capacité sous le nombre d'élèves déjà inscrits.
  const activeEnrollments = await prisma.enrollment.count({
    where: { groupId: id, isActive: true },
  });

  if (capacity < activeEnrollments) {
    return actionError(
      `Ce groupe compte ${activeEnrollments} élève${activeEnrollments > 1 ? "s" : ""} inscrit${activeEnrollments > 1 ? "s" : ""}. La capacité ne peut pas être inférieure.`,
    );
  }

  try {
    await prisma.group.update({
      where: { id },
      data: {
        levelId: data.levelId,
        name: data.name,
        monthlyFee: normalizeMoney(data.monthlyFee),
        capacity,
        isActive: data.isActive,
      },
    });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return actionError("Un groupe porte déjà ce nom pour ce niveau.");
    }

    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Ce groupe n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function deleteGroup(input: z.infer<typeof idOnlySchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const [enrollmentCount, sessionCount] = await Promise.all([
    prisma.enrollment.count({ where: { groupId: parsed.data.id } }),
    prisma.session.count({ where: { groupId: parsed.data.id } }),
  ]);

  if (enrollmentCount > 0 || sessionCount > 0) {
    return actionError(
      "Ce groupe possède un historique (inscriptions ou séances). Désactivez-le au lieu de le supprimer.",
    );
  }

  try {
    await prisma.group.delete({ where: { id: parsed.data.id } });
    refreshSubjects();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Ce groupe n'existe plus.");
    }

    return unexpectedError(error);
  }
}
