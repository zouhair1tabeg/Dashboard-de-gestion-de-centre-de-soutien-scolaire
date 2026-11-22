import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { PrintButton } from "./print-button";

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

  const { student, group } = payment.enrollment;
  const { level } = group;
  const { subject } = level;

  const formattedMonth = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${payment.month}-02`));

  const amountDue = Number(payment.amountDue);
  const amountPaid = Number(payment.amountPaid);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between print:hidden">
        <PageHeader title="Reçu de Paiement" description={`N° ${payment.id}`} />
        <PrintButton />
      </div>

      <Card className="border-2 border-black p-8 print:border-none print:p-0">
        <CardContent className="space-y-6">
          <div className="flex justify-between border-b pb-4">
            <div>
              <h1 className="text-xl font-bold uppercase">Centre de Soutien Scolaire</h1>
              <p className="text-sm text-muted-foreground">Reçu de paiement en espèces</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Date : {new Date().toLocaleDateString("fr-FR")}</p>
              <p className="text-xs text-muted-foreground">Reçu # {payment.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
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

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex justify-between font-medium">
              <span>Mois concerné :</span>
              <span className="capitalize">{formattedMonth}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Montant Dû :</span>
              <span>{amountDue} DH</span>
            </div>
            <div className="mt-1 flex justify-between font-bold text-green-700">
              <span>Montant Réglé :</span>
              <span>{amountPaid} DH</span>
            </div>
            <div className="mt-1 flex justify-between text-destructive">
              <span>Reste à Payer :</span>
              <span>{amountDue - amountPaid} DH</span>
            </div>
          </div>

          {payment.note && (
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold">Note / Remarque :</p>
              <p>{payment.note}</p>
            </div>
          )}

          <div className="mt-12 flex justify-between pt-8 text-xs text-muted-foreground border-t">
            <div>
              <p>Cachet et Signature du Centre</p>
            </div>
            <div>
              <p>Signature de l&apos;élève / parent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}