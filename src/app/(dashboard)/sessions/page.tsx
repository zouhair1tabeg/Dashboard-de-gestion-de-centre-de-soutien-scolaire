import { CalendarDays } from "lucide-react";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Séances"
        description="Planning hebdomadaire, appel et modifications ponctuelles des séances."
      />
      <ModulePlaceholder
        icon={CalendarDays}
        title="Module en préparation"
        description="Le planning des séances et la gestion des présences seront ajoutés lors d'une prochaine étape."
      />
    </div>
  );
}
