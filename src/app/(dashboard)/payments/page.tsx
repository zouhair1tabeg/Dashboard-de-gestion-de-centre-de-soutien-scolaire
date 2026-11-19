import { Wallet } from "lucide-react";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Suivi mensuel des paiements en espèces, par inscription."
      />
      <ModulePlaceholder
        icon={Wallet}
        title="Module en préparation"
        description="Le suivi des paiements mensuels sera ajouté lors d'une prochaine étape."
      />
    </div>
  );
}
