import { notFound } from "next/navigation";

import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { ReceiptActions } from "./receipt-actions";

// Lecture de la base et de la session : rendu bloquant à chaque requête.
export const instant = false;

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      enrollment: {
        include: {
          student: true,
          group: {
            include: {
              level: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    notFound();
  }

  // Numéro de reçu lisible : année du mois payé + rang chronologique global.
  // Le tri par id départage les paiements créés à la même milliseconde.
  const sequence = await prisma.payment.count({
    where: {
      OR: [
        { createdAt: { lt: payment.createdAt } },
        { createdAt: payment.createdAt, id: { lte: payment.id } },
      ],
    },
  });
  const receiptNumber = `REC-${payment.month.slice(0, 4)}-${String(sequence).padStart(6, "0")}`;

  const { student, group } = payment.enrollment;
  const { level } = group;
  const { subject } = level;

  const formattedMonth = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${payment.month}-02`));

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const amountDue = Number(payment.amountDue);
  const amountPaid = Number(payment.amountPaid);

  return (
    <main className="mx-auto w-full max-w-[800px] bg-white px-4 py-8 sm:px-8 sm:py-10">
      <ReceiptActions />

      <article className="receipt-sheet mt-6 rounded-xl border border-neutral-300 bg-white p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 pb-5">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">
              Centre de Soutien Scolaire
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reçu de paiement en espèces
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Date : {formattedDate}</p>
            <p className="mt-1 text-sm font-bold">{receiptNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Élève :</p>
            <p className="font-semibold">{student.fullName}</p>
            <p>{student.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Inscription :</p>
            <p className="font-semibold">
              {subject.name} - {level.name}
            </p>
            <p>Groupe : {group.name}</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-5 text-sm">
          <div className="flex justify-between font-medium">
            <span>Mois concerné :</span>
            <span className="capitalize">{formattedMonth}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Montant dû :</span>
            <span>{formatCurrency(amountDue)}</span>
          </div>
          <div className="mt-1 flex justify-between font-bold text-green-700">
            <span>Montant réglé :</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="mt-1 flex justify-between text-destructive">
            <span>Reste à payer :</span>
            <span>{formatCurrency(amountDue - amountPaid)}</span>
          </div>
        </div>

        {payment.note && (
          <div className="mt-5 text-xs text-muted-foreground">
            <p className="font-semibold">Note / Remarque :</p>
            <p>{payment.note}</p>
          </div>
        )}

        <div className="mt-12 flex justify-between border-t border-neutral-300 pt-8 text-xs text-muted-foreground">
          <div>
            <p>Cachet et Signature du Centre</p>
          </div>
          <div>
            <p>Signature de l&apos;élève / parent</p>
          </div>
        </div>
      </article>
    </main>
  );
}
