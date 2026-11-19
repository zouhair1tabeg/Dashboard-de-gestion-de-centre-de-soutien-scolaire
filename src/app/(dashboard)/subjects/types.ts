export type SubjectTypeValue = "SCHOOL" | "LANGUAGE";

export type GroupData = {
  id: string;
  name: string;
  monthlyFee: string;
  capacity: number;
  isActive: boolean;
  enrolledCount: number;
};

export type LevelData = {
  id: string;
  name: string;
  groups: GroupData[];
};

export type SubjectData = {
  id: string;
  name: string;
  type: SubjectTypeValue;
  levels: LevelData[];
};

export function fillRate(enrolled: number, capacity: number): number {
  if (capacity <= 0) return 0;

  return Math.round((enrolled / capacity) * 100);
}
