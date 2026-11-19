"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

import type { StudentRow } from "./types";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, StudentRow>();

const columns = helper.columns([
  helper.accessor("fullName", {
    header: "Élève",
    cell: (info) => (
      <Link
        href={`/students/${info.row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor("phone", {
    header: "Téléphone",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  helper.accessor("groupLabels", {
    header: "Groupes",
    cell: (info) => {
      const labels = info.getValue();

      if (labels.length === 0) {
        return <span className="text-xs text-muted-foreground">Aucun groupe</span>;
      }

      return (
        <div className="flex max-w-72 flex-wrap gap-1">
          {labels.map((label) => (
            <Badge key={label} variant="secondary" className="font-normal">
              {label}
            </Badge>
          ))}
        </div>
      );
    },
  }),
  helper.accessor("registeredAt", {
    header: "Inscrit le",
    cell: (info) => (
      <span className="tabular-nums text-muted-foreground">{formatDate(info.getValue())}</span>
    ),
  }),
  helper.accessor("isActive", {
    header: "Statut",
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="secondary">Actif</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Archivé
        </Badge>
      ),
  }),
  helper.display({
    id: "actions",
    header: "",
    cell: (info) => (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/students/${info.row.original.id}`}>
            Ouvrir
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    ),
  }),
]);

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const table = useTable({ features, columns, data: rows });

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-10">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className="py-3">
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
