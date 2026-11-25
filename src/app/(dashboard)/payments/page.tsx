"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PlusCircle,
  Receipt,
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
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { SerializedPayment } from "@/lib/serialize";

function getCurrentMonthYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonth(monthStr: string, months: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${m}`;
}

function subtractMonth(monthStr: string): string {
  return addMonth(monthStr, -1);
}

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<SerializedPayment[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SerializedPayment | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- Gestion du mois (tableau principal) ---
  const defaultMonth = getCurrentMonthYYYYMM();
  let initialMonth = defaultMonth;
  const urlMonth = searchParams.get("month");
  // Autorise mois courant + 1 maximum
  const maxAllowedMonth = addMonth(defaultMonth, 1);
  if (urlMonth) {
    if (urlMonth > maxAllowedMonth) {
      initialMonth = maxAllowedMonth;
    } else {
      initialMonth = urlMonth;
    }
  } else {
    initialMonth = defaultMonth;
  }

  const [monthParam, setMonthParam] = useState(initialMonth);
  const statusParam = searchParams.get("status") || "ALL";

  // --- Calcul des totaux ---
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const totalRemaining = payments.reduce(
    (sum, p) => sum + Number(p.amountDue || 0) - Number(p.amountPaid || 0),
    0,
  );

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await getPayments({
      month: monthParam || undefined,
      status: statusParam === "ALL" ? undefined : statusParam,
    });

    if (res.ok && res.payments) {
      setPayments(res.payments);
    }
    setLoading(false);
  }, [monthParam, statusParam]);

  useEffect(() => {
    let active = true;

    // Chargement asynchrone : aucun setState synchrone dans l'effet.
    async function load() {
      const res = await getPayments({
        month: monthParam || undefined,
        status: statusParam === "ALL" ? undefined : statusParam,
      });

      if (!active) return;

      if (res.ok && res.payments) {
        setPayments(res.payments);
      }
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [monthParam, statusParam]);

  const handleOpenGenModal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let nextMonth: number;
    let nextYear: number;
    if (month === 11) {
      nextMonth = 0;
      nextYear = year + 1;
    } else {
      nextMonth = month + 1;
      nextYear = year;
    }
    const formatted = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
    setGenMonth(formatted);
    setGenOpen(true);
  };

  const handleGenerate = async () => {
    if (!genMonth) return;
    if (genMonth > maxAllowedMonth) {
      toast.error("Impossible de générer pour un mois trop éloigné.");
      setGenOpen(false);
      return;
    }
    setSubmitting(true);
    const res = await generateMonthlyPayments(genMonth);
    setSubmitting(false);
    if (res.ok) {
      toast.success(`${res.created} paiements générés, ${res.skipped} déjà existants.`);
      setGenOpen(false);
      // Reset the month to next month for next time
      setGenMonth("");
      fetchPayments();
    } else {
      toast.error(res.error);
    }
  };

  const handleExportExcel = async () => {
    if (!monthParam) {
      toast.error("Sélectionnez un mois à exporter d'abord.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/payments/export?month=${monthParam}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'export");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paiements-${monthParam}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Fichier Excel téléchargé avec succès");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation du fichier");
    } finally {
      setSubmitting(false);
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
          <>
            <Button onClick={handleOpenGenModal} disabled={loading}>
              <PlusCircle className="mr-2 size-4" />
              Générer le mois
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading}
              className="ml-2"
            >
              <Download className="mr-2 size-4" />
              Exporter
            </Button>
          </>
        }
      />

      {/* --- Sélecteur de mois avec navigation --- */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Mois</Label>

              {/* Bouton précédent */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newMonth = subtractMonth(monthParam);
                  setMonthParam(newMonth);
                  updateFilters("month", newMonth);
                }}
                disabled={monthParam === undefined}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {/* Sélecteur de mois */}
              <Input
                type="month"
                value={monthParam || ""}
                className="w-40"
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d{4}-\d{2}$/.test(val)) {
                    setMonthParam(val);
                    updateFilters("month", val);
                  }
                }}
              />

              {/* Bouton suivant */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newMonth = addMonth(monthParam || defaultMonth, 1);
                  setMonthParam(newMonth);
                  updateFilters("month", newMonth);
                }}
                disabled={monthParam === maxAllowedMonth}
              >
                <ChevronRight className="size-4" />
              </Button>
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

          {/* --- Totaux du mois --- */}
          <div className="flex items-center gap-6">
            {payments.length > 0 || monthParam ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong>Encaissé :</strong>{" "}
                  {totalPaid.toLocaleString("fr-FR")} DH
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Reste à payer :</strong>{" "}
                  {totalRemaining.toLocaleString("fr-FR")} DH
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sélectionnez un mois pour voir les totaux.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- Liste des paiements --- */}
      <Card>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="sticky top-0 w-full">
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider col-span-1">
                    Élève
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider col-span-1">
                    Groupe
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider col-span-1">
                    Mois
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-right text-xs font-medium uppercase tracking-wider col-span-1">
                    Dû
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-right text-xs font-medium uppercase tracking-wider col-span-1">
                    Réglé
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-right text-xs font-medium uppercase tracking-wider col-span-1">
                    Reste
                  </TableHead>
                  <TableHead className="bg-muted/50 text-muted-foreground text-xs font-medium uppercase tracking-wider col-span-1">
                    Actions
                  </TableHead>
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
                      <p className="font-medium">
                        Aucun paiement trouvé pour {monthParam?.split("-")[1] || "ce mois"}.
                      </p>
                      {monthParam && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenGenModal}
                        >
                          Générer les paiements de ce mois
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.studentFullName}
                        {p.studentPhone && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {p.studentPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {p.subjectName} · {p.groupName}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {new Intl.DateTimeFormat("fr-FR", {
                          month: "long",
                          year: "numeric",
                        }).format(new Date(`${p.month}-02`))}
                      </TableCell>
                      <TableCell className="text-right">{p.amountDue} DH</TableCell>
                      <TableCell className="text-right">{p.amountPaid} DH</TableCell>
                      <TableCell className="text-right">
                        {Number(p.amountDue || 0) - Number(p.amountPaid || 0)} DH
                      </TableCell>
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
                                setPayAmount(
                                  String(p.amountDue - p.amountPaid)
                                );
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
                            <Link
                              href={`/payments/${p.id}/receipt`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
          </div>
        </CardContent>
      </Card>

      {/* Dialog Génération */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer les paiements</DialogTitle>
            <DialogDescription>
              Crée les paiements «&nbsp;Impayé&nbsp;» pour toutes les inscriptions actives du mois.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Mois cible</Label>
            <Input
              type="month"
              value={genMonth}
              onChange={(e) => setGenMonth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {genMonth > maxAllowedMonth ? (
                "⚠️ Impossible de générer pour un mois dépassant le courant + 1"
              ) : (
                `Mois courant : ${defaultMonth}, suivant : ${maxAllowedMonth}`
              )}
            </p>
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
              Enregistrez le montant reçu en espèces pour {selectedPayment?.studentFullName}.
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