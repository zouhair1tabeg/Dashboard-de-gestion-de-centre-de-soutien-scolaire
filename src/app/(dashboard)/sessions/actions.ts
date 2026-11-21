"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { actionError, unexpectedError, validationError, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth-guard";
import { addDays, dayOfWeek, endOfMonth, parseDateOnly, toDateKey } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { idSchema, parseDateInput } from "@/lib/validations/academic";
import {
  attendanceInputSchema,
  generateSessionsSchema,
  markAllPresentSchema,
  scheduleInputSchema,
  sessionActionSchema,
} from "@/lib/validations/scheduling";

const unauthorized = actionError("Votre session a expiré. Veuillez vous reconnecter.");
const UNAUTHORIZED_MESSAGE = "Votre session a expiré. Veuillez vous reconnecter.";

const updateScheduleInputSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format HH:mm)."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format HH:mm)."),
});

export type GenerateSessionsResult =
  | { ok: true; created: number; existing: number }
  | { ok: false; error: string };

export type MarkAllPresentResult =
  | { ok: true; marked: number }
  | { ok: false; error: string };

class BusinessError extends Error {}

function refreshSessions(sessionId?: string) {
  revalidatePath("/sessions");
  revalidatePath("/sessions/schedules");

  if (sessionId) {
    revalidatePath(`/sessions/${sessionId}`);
  }
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function rosterFilter(groupId: string, date: Date): Prisma.EnrollmentWhereInput {
  return {
    groupId,
    startDate: { lte: date },
    OR: [{ endDate: null }, { endDate: { gte: date } }],
  };
}

async function assertNoOverlap(input: {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  exceptId?: string;
}) {
  const slots = await prisma.schedule.findMany({
    where: {
      groupId: input.groupId,
      dayOfWeek: input.dayOfWeek,
      ...(input.exceptId ? { id: { not: input.exceptId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  const clash = slots.some(
    (slot) => input.startTime < slot.endTime && input.endTime > slot.startTime,
  );

  if (clash) {
    throw new BusinessError("Un créneau de ce groupe chevauche déjà cet horaire.");
  }
}

export async function createSchedule(
  input: z.infer<typeof scheduleInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = scheduleInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const group = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true, isActive: true },
    });

    if (!group) {
      throw new BusinessError("Ce groupe n'existe plus.");
    }

    if (!group.isActive) {
      throw new BusinessError("Ce groupe est désactivé. Réactivez-le avant d'ajouter un horaire.");
    }

    await assertNoOverlap(parsed.data);

    await prisma.schedule.create({
      data: {
        groupId: parsed.data.groupId,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
      },
    });
    refreshSessions();

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}

export async function updateSchedule(
  input: z.infer<typeof updateScheduleInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = updateScheduleInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.endTime <= parsed.data.startTime) {
    return actionError("L'heure de fin doit être postérieure à l'heure de début.");
  }

  try {
    await assertNoOverlap({ ...parsed.data, exceptId: parsed.data.id });

    await prisma.schedule.update({
      where: { id: parsed.data.id },
      data: {
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
      },
    });
    refreshSessions();

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cet horaire n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function deleteSchedule(input: { id: string }): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.schedule.delete({ where: { id: parsed.data.id } });
    refreshSessions();

    return { ok: true };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cet horaire n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function generateMonthSessions(
  input: z.infer<typeof generateSessionsSchema>,
): Promise<GenerateSessionsResult> {
  if (!(await requireAdmin())) return { ok: false, error: UNAUTHORIZED_MESSAGE };

  const parsed = generateSessionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mois invalide." };
  }

  const { month, groupId } = parsed.data;
  const first = `${month}-01`;
  const last = endOfMonth(first);

  try {
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        ...(groupId ? { id: groupId } : {}),
      },
      select: {
        id: true,
        name: true,
        schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } },
      },
    });

    if (groups.length === 0) {
      return { ok: false, error: "Aucun groupe actif ne correspond à la sélection." };
    }

    if (groups.every((group) => group.schedules.length === 0)) {
      return {
        ok: false,
        error: "Aucun horaire hebdomadaire n'est défini. Ajoutez des horaires avant de générer les séances.",
      };
    }

    const existing = await prisma.session.findMany({
      where: {
        groupId: { in: groups.map((group) => group.id) },
        date: { gte: parseDateOnly(first), lte: parseDateOnly(last) },
      },
      select: { groupId: true, date: true, startTime: true },
    });

    const seen = new Set(
      existing.map((session) => `${session.groupId}|${toDateKey(session.date)}|${session.startTime}`),
    );
    const data: Prisma.SessionCreateManyInput[] = [];
    let existingCount = 0;

    for (const group of groups) {
      let cursor = first;

      while (cursor <= last) {
        const slots = group.schedules.filter((slot) => slot.dayOfWeek === dayOfWeek(cursor));

        for (const slot of slots) {
          const key = `${group.id}|${cursor}|${slot.startTime}`;

          if (seen.has(key)) {
            existingCount += 1;
          } else {
            seen.add(key);
            data.push({
              groupId: group.id,
              date: parseDateInput(cursor),
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: "PLANNED",
            });
          }
        }

        cursor = addDays(cursor, 1);
      }
    }

    if (data.length > 0) {
      await prisma.session.createMany({ data });
    }

    refreshSessions();

    return { ok: true, created: data.length, existing: existingCount };
  } catch (error) {
    console.error(error);

    return { ok: false, error: "Impossible de générer les séances. Veuillez réessayer." };
  }
}

export async function updateSession(
  input: z.infer<typeof sessionActionSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = sessionActionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const payload = parsed.data;

  try {
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, date: true, status: true },
    });

    if (!session) {
      throw new BusinessError("Cette séance n'existe plus.");
    }

    if (payload.action === "RESTORE") {
      if (session.status !== "CANCELLED" && session.status !== "POSTPONED") {
        throw new BusinessError("Seule une séance annulée ou reportée peut être rétablie.");
      }

      await prisma.session.update({
        where: { id: session.id },
        data: { status: "PLANNED", replacementDate: null, note: null },
      });
      refreshSessions(session.id);

      return { ok: true };
    }

    if (session.status === "DONE") {
      throw new BusinessError("Cette séance est déjà effectuée : elle ne peut plus être modifiée.");
    }

    if (payload.action === "CANCEL") {
      if (session.status === "CANCELLED") {
        throw new BusinessError("Cette séance est déjà annulée.");
      }

      await prisma.session.update({
        where: { id: session.id },
        data: { status: "CANCELLED", note: optionalText(payload.note) },
      });
      refreshSessions(session.id);

      return { ok: true };
    }

    if (payload.action === "POSTPONE") {
      if (session.status === "CANCELLED") {
        throw new BusinessError("Rétablissez d'abord la séance avant de la reporter.");
      }

      const replacement = parseDateInput(payload.replacementDate);

      if (toDateKey(replacement) === toDateKey(session.date)) {
        throw new BusinessError(
          "La nouvelle date doit être différente de la date d'origine. Pour changer l'heure, utilisez « Décaler ».",
        );
      }

      await prisma.session.update({
        where: { id: session.id },
        data: {
          status: "POSTPONED",
          replacementDate: replacement,
          note: optionalText(payload.note),
        },
      });
      refreshSessions(session.id);

      return { ok: true };
    }

    if (session.status === "CANCELLED") {
      throw new BusinessError("Rétablissez d'abord la séance avant de la décaler.");
    }

    if (payload.endTime <= payload.startTime) {
      throw new BusinessError("L'heure de fin doit être postérieure à l'heure de début.");
    }

    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "RESCHEDULED",
        startTime: payload.startTime,
        endTime: payload.endTime,
        replacementDate: null,
        note: optionalText(payload.note),
      },
    });
    refreshSessions(session.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    if (isPrismaErrorCode(error, "P2025")) {
      return actionError("Cette séance n'existe plus.");
    }

    return unexpectedError(error);
  }
}

export async function saveAttendance(
  input: z.infer<typeof attendanceInputSchema>,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return unauthorized;

  const parsed = attendanceInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const session = await prisma.session.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true, groupId: true, date: true, replacementDate: true, status: true },
    });

    if (!session) {
      throw new BusinessError("Cette séance n'existe plus.");
    }

    if (session.status === "CANCELLED") {
      throw new BusinessError("Cette séance est annulée : l'appel est impossible.");
    }

    const rosterDate = session.replacementDate ?? session.date;
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: parsed.data.studentId,
        ...rosterFilter(session.groupId, rosterDate),
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new BusinessError("Cet élève n'est pas inscrit à cette séance.");
    }

    await prisma.$transaction([
      prisma.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: parsed.data.studentId,
          },
        },
        create: {
          sessionId: session.id,
          studentId: parsed.data.studentId,
          status: parsed.data.status,
        },
        update: { status: parsed.data.status },
      }),
      prisma.session.updateMany({
        where: { id: session.id, status: { in: ["PLANNED", "RESCHEDULED"] } },
        data: { status: "DONE" },
      }),
    ]);
    refreshSessions(session.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof BusinessError) {
      return actionError(error.message);
    }

    return unexpectedError(error);
  }
}

export async function markAllPresent(
  input: z.infer<typeof markAllPresentSchema>,
): Promise<MarkAllPresentResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  const parsed = markAllPresentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Séance invalide." };
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true, groupId: true, date: true, replacementDate: true, status: true },
    });

    if (!session) {
      throw new BusinessError("Cette séance n'existe plus.");
    }

    if (session.status === "CANCELLED") {
      throw new BusinessError("Cette séance est annulée : l'appel est impossible.");
    }

    const enrollments = await prisma.enrollment.findMany({
      where: rosterFilter(session.groupId, session.replacementDate ?? session.date),
      select: { studentId: true },
    });

    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.studentId))];

    await prisma.$transaction([
      prisma.attendance.createMany({
        data: studentIds.map((studentId) => ({
          sessionId: session.id,
          studentId,
          status: "PRESENT" as const,
        })),
        skipDuplicates: true,
      }),
      // « Tous présents » corrige aussi les absences déjà pointées.
      prisma.attendance.updateMany({
        where: { sessionId: session.id, status: "ABSENT" },
        data: { status: "PRESENT" },
      }),
      prisma.session.updateMany({
        where: { id: session.id, status: { in: ["PLANNED", "RESCHEDULED"] } },
        data: { status: "DONE" },
      }),
    ]);
    refreshSessions(session.id);

    return { ok: true, marked: studentIds.length };
  } catch (error) {
    if (error instanceof BusinessError) {
      return { ok: false, error: error.message };
    }

    console.error(error);

    return { ok: false, error: "Impossible d'enregistrer l'appel. Veuillez réessayer." };
  }
}
