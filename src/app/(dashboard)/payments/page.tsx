"use client";

import {
  CalendarDays,
  CheckCheck,
  Download,
  Filter,
  Loader2,
  Plus,
  PlusCircle,
  Receipt,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  generateMonthlyPayments,
  getPayments,
  recordPayment,
} from "@/app/(dashboard)/payments/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportExcelButton } from "@/components/ui/export-excel";

type PaymentView = {
  id: string;
  enrollmentId: string;
  studentName: string;
  groupName: string;
  subjectName: string;
  levelName: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  paidAt: Date | null;
  note: string | null;
};

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentView[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentView | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const monthParam = searchParams.get("month") || "";
  const statusParam = searchParams.get("status") || "ALL";

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await getPayments({
      month: monthParam || undefined,
      status: statusParam === "ALL" ? undefined : statusParam,
    });

    if (res.ok && res.payments) {
      setPayments(
        res.payments.map((p: any) => ({
          id: p.id,
          enrollmentId: p.enrollmentId,
          studentName: p.studentFullName,
          groupName: p.groupName,
          subjectName: p.subjectName,
          levelName: p.levelName,
          month: p.month,
          amountDue: Number(p.amountDue),
          amountPaid: Number(p.amountPaid),
          status: p.status,
          paidAt: p.paidAt,
          note: p.note,
        })),
      );
    }
    setLoading(false);
  }, [monthParam, statusParam]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleGenerate = async () => {
    if (!genMonth) return;
    setSubmitting(true);
    const res = await generateMonthlyPayments(genMonth);
    setSubmitting(false);
    if (res.ok) {
      toast.success(`${res.created} paiements générés.`);
      setGenOpen(false);
      fetchPayments();
    } else {
      toast.error(res.error);
    }
  };

  const handleRecord = async () => {
    if (!selectedPayment || !payAmount) return;
    setSubmitting(true);
    const res = await recordPayment(
      selectedPayment.enrollmentId,
      selectedPayment.month,
      Number(payAmount),
      payNote,
    );
    setSubmitting(false);
    if (res.ok) {
      toast.success("Paiement enregistré.");
      setPayOpen(false);
      fetchPayments();
    } else {
      toast.error(res.error);
    }
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    router.push(`/payments?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Gestion des cotisations mensuelles par élève."
        actions={
          <Button onClick={() => setGenOpen(true)}>
            <PlusCircle className="mr-2 size-4" />
            Générer le mois
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Mois</Label>
              <Input
                type="month"
                value={monthParam}
                className="w-40"
                onChange={(e) => updateFilters("month", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Statut</Label>
              <Select
                value={statusParam}
                onValueChange={(val) => updateFilters("status", val)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="UNPAID">Impayés</SelectItem>
                  <SelectItem value="PARTIAL">Partiels</SelectItem>
                  <SelectItem value="PAID">Payés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ExportExcelButton
            data={payments.map((p) => ({
              Eleve: p.studentName,
              Groupe: p.groupName,
              Mois: p.month,
              MontantDu: p.amountDue,
              MontantRegle: p.amountPaid,
              Statut: p.status === "PAID" ? "Payé" : p.status === "PARTIAL" ? "Partiel" : "Impayé",
              Note: p.note || "",
            }))}
            filename="paiements_centre_prime"
            label="Exporter les paiements"
          />
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Groupe</TableHead>
              <TableHead>Mois</TableHead>
              <TableHead>Dû</TableHead>
              <TableHead>Réglé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucun paiement trouvé.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.studentName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {p.subjectName} · {p.groupName}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
                      new Date(`${p.month}-02`),
                    )}
                  </TableCell>
                  <TableCell>{p.amountDue} DH</TableCell>
                  <TableCell>{p.amountPaid} DH</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "PAID"
                          ? "default"
                          : p.status === "PARTIAL"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {p.status === "PAID" ? "Payé" : p.status === "PARTIAL" ? "Partiel" : "Impayé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {p.status !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(p);
                            setPayAmount(String(p.amountDue - p.amountPaid));
                            setPayOpen(true);
                          }}
                        >
                          Régler
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reçu"
                        asChild
                      >
                        <Link href={`/payments/${p.id}/receipt`} target="_blank">
                          <Receipt className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog Génération */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer les paiements</DialogTitle>
            <DialogDescription>
              Crée les paiements "Impayé" pour toutes les inscriptions actives du mois.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Mois cible</Label>
            <Input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={!genMonth || submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Paiement */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaisser un paiement</DialogTitle>
            <DialogDescription>
              Enregistrez le montant reçu en espèces pour {selectedPayment?.studentName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Montant à ajouter (DH)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reste à payer : {selectedPayment ? selectedPayment.amountDue - selectedPayment.amountPaid : 0} DH
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Input
                placeholder="Ex: Paiement par le père"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRecord} disabled={!payAmount || submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmer l&apos;encaissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}