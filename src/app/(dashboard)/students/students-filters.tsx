"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | "active" | "inactive";

export function StudentsFilters({
  groups,
  initialQuery,
  initialStatus,
  initialGroup,
}: {
  groups: { id: string; label: string }[];
  initialQuery: string;
  initialStatus: StatusFilter;
  initialGroup: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [group, setGroup] = useState(initialGroup);

  const hasFilters = query.trim() !== "" || status !== "all" || group !== "";

  function navigate(next: { query?: string; status?: StatusFilter; group?: string }) {
    const nextQuery = next.query ?? query;
    const nextStatus = next.status ?? status;
    const nextGroup = next.group ?? group;
    const params = new URLSearchParams();

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextGroup) params.set("group", nextGroup);

    router.push(params.size > 0 ? `/students?${params.toString()}` : "/students");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate({});
      }}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end"
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="student-search">Recherche</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="student-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, téléphone ou téléphone du parent"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5 md:w-40">
        <Label htmlFor="student-status">Statut</Label>
        <Select
          value={status}
          onValueChange={(value) => {
            const nextStatus = value as StatusFilter;
            setStatus(nextStatus);
            navigate({ status: nextStatus });
          }}
        >
          <SelectTrigger id="student-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 md:w-64">
        <Label htmlFor="student-group">Groupe</Label>
        <Select
          value={group || "all"}
          onValueChange={(value) => {
            const nextGroup = value === "all" ? "" : value;
            setGroup(nextGroup);
            navigate({ group: nextGroup });
          }}
        >
          <SelectTrigger id="student-group" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            {groups.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
        {hasFilters ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/students">Réinitialiser</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
