import { BookOpen } from "lucide-react";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PageHeader } from "@/components/layout/page-header";

export default function SubjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Matières & Groupes"
        description="Matières, niveaux, groupes, tarifs mensuels et capacités."
      />
      <ModulePlaceholder
        icon={BookOpen}
        title="Module en préparation"
        description="La gestion des matières, des niveaux et des groupes sera ajoutée lors d'une prochaine étape."
      />
    </div>
  );
}
