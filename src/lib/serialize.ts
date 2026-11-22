/**
 * Utility functions for serializing Prisma types to plain JS objects
 * that can be safely passed to Client Components.
 *
 * Prisma Decimal objects are NOT supported by Next.js 16 when crossing
 * the server-client boundary. All fields must be converted to primitive
 * types (number, string, boolean, null) before returning from Server Actions
 * or Server Components that feed Client Components.
 *
 * Usage:
 *   import { serializePayment, serializeEnrollment } from "@/lib/serialize";
 *
 *   // In a Server Action or Server Component before returning data:
 *   const payment = await prisma.payment.findUnique({ where: { id } });
 *   return serializePayment(payment);
 */

// Prisma Decimal → nombre fini (number)
// Prisma envoie des objets Decimal qui ne sont pas des instances JS native.
// On vérifie la présence de la méthode toString propre à Decimal Prisma.
// Number() classique suffit pour la conversion, et on évite la dépendance
// externe decimal.js pour garder le bundle léger.
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  // Prisma Decimal : objet avec toString mais pas instanceof Date/Number
  if (value !== undefined && typeof value === "object" && typeof (value as any).toString === "function") {
    try {
      const str = (value as any).toString();
      const n = Number(str);
      return n || 0;
    } catch {
      return 0;
    }
  }
  // Fallback classique
  const num = Number(value);
  return num || 0;
}

// Prisma Decimal → string (pour affichage ou stockage)
export function toString(value: unknown): string {
  if (value === null || value === undefined) return "0";
  if (typeof value === "string") return value;
  return String(value);
}

// Prisma DateTime → ISO string
export function toISOString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  // Prisma peut renvoyer des objets spéciaux
  try {
    const d = new Date(value as any);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString();
  } catch {
    return String(value);
  }
}

// === Sérialisation complète des types courants ===

// Payment : retourne un objet quasi-plat avec les infos essentielles pour l'affichage
// Note: on garde enrollmentId + les champs relations fréquemment utilisés
// pour éviter les requêtes supplémentaires dans les Client Components.
export interface SerializedPayment {
  id: string;
  enrollmentId: string;
  studentFullName: string;
  groupName: string;
  subjectName: string;
  levelName: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  note?: string | null;
  paidAt?: string | null;
}

// Payment -> SerializedPayment
export function serializePayment(payment: any): SerializedPayment {
  const enrollment = payment.enrollment || {};
  return {
    id: payment.id,
    enrollmentId: payment.enrollmentId,
    studentFullName: enrollment.student?.fullName || "",
    groupName: enrollment.group?.name || "",
    subjectName: enrollment.group?.level?.subject?.name || "",
    levelName: enrollment.group?.level?.name || "",
    month: payment.month,
    amountDue: toNumber(payment.amountDue),
    amountPaid: toNumber(payment.amountPaid),
    status: payment.status,
    note: payment.note,
    paidAt: toISOString(payment.paidAt),
  };
}

// Enrollment : retourne un objet plat
export interface SerializedEnrollment {
  id: string;
  studentId: string;
  groupId: string;
  startDate: string;
  endDate?: string | null;
  discount: number;
  isActive: boolean;
}

// Enrollment -> SerializedEnrollment
export function serializeEnrollment(enrollment: any): SerializedEnrollment {
  return {
    id: enrollment.id,
    studentId: enrollment.studentId,
    groupId: enrollment.groupId,
    startDate: enrollment.startDate.toISOString(),
    endDate: enrollment.endDate?.toISOString ?? null,
    discount: toNumber(enrollment.discount),
    isActive: enrollment.isActive,
  };
}

// Group : retourne un objet plat
export interface SerializedGroup {
  id: string;
  name: string;
  levelId: string;
  monthlyFee: number;
  capacity: number;
  isActive: boolean;
}

// Group -> SerializedGroup
export function serializeGroup(group: any): SerializedGroup {
  return {
    id: group.id,
    name: group.name,
    levelId: group.levelId,
    monthlyFee: toNumber(group.monthlyFee),
    capacity: group.capacity ?? 0,
    isActive: group.isActive,
  };
}

// Level : retourne un objet plat
export interface SerializedLevel {
  id: string;
  name: string;
  subjectId: string;
}

// Level -> SerializedLevel
export function serializeLevel(level: any): SerializedLevel {
  return {
    id: level.id,
    name: level.name,
    subjectId: level.subjectId,
  };
}

// Student : retourne un objet plat
export interface SerializedStudent {
  id: string;
  fullName: string;
  phone: string;
  parentName?: string | null;
  parentPhone?: string | null;
  registeredAt: string;
  isActive: boolean;
}

// Student -> SerializedStudent
export function serializeStudent(student: any): SerializedStudent {
  return {
    id: student.id,
    fullName: student.fullName,
    phone: student.phone ?? "",
    parentName: student.parentName ?? null,
    parentPhone: student.parentPhone ?? null,
    registeredAt: student.registeredAt.toISOString(),
    isActive: student.isActive,
  };
}

// Subject : retourne un objet plat
export interface SerializedSubject {
  id: string;
  name: string;
  type: "SCHOOL" | "LANGUAGE";
}

// Subject -> SerializedSubject
export function serializeSubject(subject: any): SerializedSubject {
  return {
    id: subject.id,
    name: subject.name,
    type: subject.type,
  };
}

// Formatage monnaie (affichage uniquement, garde le Decimal côté serveur)
// Note: cette fonction est utilisée uniquement dans les composants Client
// qui reçoivent déjà des nombres sérialisés.
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} DH`;
}

// Vérifie si une valeur est un objet Decimal Prisma (pour debug)
// Prisma Decimal a une méthode toString spécifique
export function isDecimal(value: unknown): boolean {
  return !!(value && typeof value === "object" && typeof (value as any).toString === "function");
}

export default { toNumber, toString, toISOString, formatCurrency, isDecimal };