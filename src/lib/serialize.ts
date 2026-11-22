/**
 * Sérialisation des valeurs Prisma (Decimal, Date) avant de les passer
 * d'un Server Component / Server Action vers un Client Component.
 *
 * Next.js ne sait pas sérialiser les objets `Decimal` de Prisma : on les
 * convertit en `number` et les dates en chaînes ISO.
 */

/** Valeur de type Decimal Prisma (objet avec `toString`) ou primitive. */
export type DecimalLike = number | string | { toString(): string };

/** Convertit une valeur (Decimal Prisma, chaîne, nombre) en nombre fini. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

/** Convertit une date Prisma en chaîne ISO (ou `null`). */
export function toISOString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type SerializedPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

/** Paiement avec ses relations, tel que renvoyé par `prisma.payment.findMany`. */
export type PaymentWithRelations = {
  id: string;
  enrollmentId: string;
  month: string;
  amountDue: DecimalLike;
  amountPaid: DecimalLike;
  status: SerializedPaymentStatus;
  note: string | null;
  paidAt: Date | string | null;
  enrollment: {
    student: { fullName: string; phone: string };
    group: {
      name: string;
      level: { name: string; subject: { name: string } };
    };
  };
};

/** Paiement prêt à être transmis à un Client Component. */
export interface SerializedPayment {
  id: string;
  enrollmentId: string;
  studentFullName: string;
  studentPhone: string;
  groupName: string;
  subjectName: string;
  levelName: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  status: SerializedPaymentStatus;
  note: string | null;
  paidAt: string | null;
}

export function serializePayment(payment: PaymentWithRelations): SerializedPayment {
  return {
    id: payment.id,
    enrollmentId: payment.enrollmentId,
    studentFullName: payment.enrollment.student.fullName,
    studentPhone: payment.enrollment.student.phone,
    groupName: payment.enrollment.group.name,
    subjectName: payment.enrollment.group.level.subject.name,
    levelName: payment.enrollment.group.level.name,
    month: payment.month,
    amountDue: toNumber(payment.amountDue),
    amountPaid: toNumber(payment.amountPaid),
    status: payment.status,
    note: payment.note,
    paidAt: toISOString(payment.paidAt),
  };
}
