import { z } from "zod";

import { idSchema } from "@/lib/validations/academic";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const timeSchema = z
  .string()
  .regex(TIME_PATTERN, "Heure invalide (format HH:mm).");

function isValidDateInput(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateSchema = z
  .string()
  .refine(isValidDateInput, "Date invalide.");

const noteSchema = z.string().trim().max(300, "300 caractères maximum.").optional();

export const scheduleInputSchema = z
  .object({
    groupId: idSchema,
    dayOfWeek: z
      .number()
      .int()
      .min(0, "Jour invalide.")
      .max(6, "Jour invalide."),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "L'heure de fin doit être postérieure à l'heure de début.",
    path: ["endTime"],
  });

export const generateSessionsSchema = z.object({
  month: z
    .string()
    .regex(MONTH_PATTERN, "Mois invalide.")
    .describe("Mois au format AAAA-MM"),
  groupId: z.string().min(1).optional(),
});

export const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("RESCHEDULE"),
    sessionId: idSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    note: noteSchema,
  }),
  z.object({
    action: z.literal("POSTPONE"),
    sessionId: idSchema,
    replacementDate: dateSchema,
    note: noteSchema,
  }),
  z.object({
    action: z.literal("CANCEL"),
    sessionId: idSchema,
    note: noteSchema,
  }),
  z.object({
    action: z.literal("RESTORE"),
    sessionId: idSchema,
  }),
]);

export const attendanceInputSchema = z.object({
  sessionId: idSchema,
  studentId: idSchema,
  status: z.enum(["PRESENT", "ABSENT"]),
});

export const markAllPresentSchema = z.object({
  sessionId: idSchema,
});
