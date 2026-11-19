import { z } from "zod";

const MONEY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeMoney(value: string): string {
  return Number(value.replace(",", ".")).toFixed(2);
}

export function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isValidDateInput(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = parseDateInput(value);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const idSchema = z.string().min(1, "Identifiant invalide.");

export const subjectTypeSchema = z.enum(["SCHOOL", "LANGUAGE"]);

export const subjectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de la matière est requis.")
    .max(80, "80 caractères maximum."),
  type: subjectTypeSchema,
});

export const levelInputSchema = z.object({
  subjectId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, "Le nom du niveau est requis.")
    .max(80, "80 caractères maximum."),
});

export const groupInputSchema = z.object({
  levelId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, "Le nom du groupe est requis.")
    .max(50, "50 caractères maximum."),
  monthlyFee: z
    .string()
    .trim()
    .min(1, "Le tarif mensuel est requis.")
    .regex(MONEY_PATTERN, "Montant invalide (ex. 350 ou 350,50).")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Le tarif doit être supérieur à 0."),
  capacity: z
    .string()
    .trim()
    .min(1, "La capacité est requise.")
    .regex(/^\d+$/, "La capacité doit être un nombre entier.")
    .refine((value) => Number(value) >= 1, "La capacité doit être d'au moins 1.")
    .refine((value) => Number(value) <= 500, "500 places maximum par groupe."),
  isActive: z.boolean(),
});

export const studentInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom complet est requis.")
    .max(120, "120 caractères maximum."),
  phone: z
    .string()
    .trim()
    .min(6, "Le téléphone est requis.")
    .max(25, "25 caractères maximum."),
  parentName: z.string().trim().max(120, "120 caractères maximum.").optional(),
  parentPhone: z.string().trim().max(25, "25 caractères maximum.").optional(),
});

export const studentActiveSchema = z.object({
  id: idSchema,
  isActive: z.boolean(),
});

export const enrollmentInputSchema = z.object({
  studentId: idSchema,
  groupId: idSchema,
  startDate: z.string().refine(isValidDateInput, "Date de début invalide."),
  discount: z
    .string()
    .trim()
    .min(1, "La remise est requise (0 si aucune).")
    .regex(MONEY_PATTERN, "Montant invalide.")
    .refine((value) => Number(value.replace(",", ".")) >= 0, "La remise ne peut pas être négative."),
});

export const changeGroupInputSchema = z.object({
  enrollmentId: idSchema,
  targetGroupId: idSchema,
  startDate: z.string().refine(isValidDateInput, "Date de changement invalide."),
  discount: z
    .string()
    .trim()
    .min(1, "La remise est requise (0 si aucune).")
    .regex(MONEY_PATTERN, "Montant invalide.")
    .refine((value) => Number(value.replace(",", ".")) >= 0, "La remise ne peut pas être négative."),
});

export const enrollmentDiscountSchema = z.object({
  enrollmentId: idSchema,
  discount: z
    .string()
    .trim()
    .min(1, "La remise est requise (0 si aucune).")
    .regex(MONEY_PATTERN, "Montant invalide.")
    .refine((value) => Number(value.replace(",", ".")) >= 0, "La remise ne peut pas être négative."),
});

export const endEnrollmentSchema = z.object({
  enrollmentId: idSchema,
});
