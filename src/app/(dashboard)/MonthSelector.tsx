"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthOption {
  value: string;
  label: string;
}

interface MonthSelectorProps {
  months: MonthOption[];
  defaultMonth: string;
}

export function MonthSelector({ months, defaultMonth }: MonthSelectorProps) {
  const router = useRouter();

  return (
    <Select
      value={defaultMonth}
      onValueChange={(val) => router.push(`/?month=${val}`)}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Sélectionner un mois" />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
