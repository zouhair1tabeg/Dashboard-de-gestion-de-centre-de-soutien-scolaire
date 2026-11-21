import { z } from "zod";

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide. Format : YYYY-MM")
  .refine((val) => !isNaN(new Date(`${val}-01`).getTime()), "Date invalide.")
  .describe("Mois au format YYYY-MM");

const amountSchema = z
  .string()
  .refine((val) => /^\d{1,10}(\.\d{1,2})?$/.test(val) || val === "", "Montant invalide.")
  .optional();

const noteSchema = z.string().trim().max(300, "300 caractères maximum.").optional();

export const createPaymentSchema = z.object({
  enrollmentId: z.string().uuid("ID d'inscription invalide"),
  month: monthSchema,
  amount: amountSchema,
  note: noteSchema,
});

export const paymentFilterSchema = z.object({
  month: monthSchema.optional(),
  status: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  groupId: z.string().uuid("ID de groupe invalide").optional(),
  subjectId: z.string().uuid("ID de matière invalide").optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;