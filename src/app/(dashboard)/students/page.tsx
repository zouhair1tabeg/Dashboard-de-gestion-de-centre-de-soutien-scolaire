import { Users } from "lucide-react";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Élèves"
        description="Fiches des élèves, coordonnées et inscriptions aux groupes."
      />
      <ModulePlaceholder
        icon={Users}
        title="Module en préparation"
        description="La gestion des élèves et de leurs inscriptions sera ajoutée lors de la prochaine étape."
      />
    </div>
  );
}
