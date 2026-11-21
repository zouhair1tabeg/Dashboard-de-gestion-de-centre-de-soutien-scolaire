"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  data: any[];
  filename: string;
  label?: string;
}

export function ExportExcelButton({ data, filename, label = "Exporter en Excel (CSV)" }: ExportButtonProps) {
  function handleExport() {
    if (!data || data.length === 0) return;

    // Récupérer les clés du premier objet pour les en-têtes
    const keys = Object.keys(data[0]);
    
    // Créer les lignes CSV
    const csvRows = [];
    csvRows.push(keys.join(";")); // Séparateur point-virgule idéal pour Excel français

    for (const row of data) {
      const values = keys.map((key) => {
        const val = row[key];
        if (val === null || val === undefined) return "";
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(";"));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8;" }); // BOM pour UTF-8 Excel
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || data.length === 0}>
      <Download className="mr-2 size-4" />
      {label}
    </Button>
  );
}
