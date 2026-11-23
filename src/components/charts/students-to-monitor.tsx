import { FC } from "react";

/**
 * List of students with most absences this month
 */
export const StudentsToMonitor: FC<{ absentStudents: any[] }> = ({ absentStudents }) => {
  if (!absentStudents || absentStudents.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Aucun élève à surveiller ce mois-ci.
      </p>
    );
  }

  return (
    <div>
      {absentStudents.slice(0, 5).map((student) => (
        <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
          <div className="flex items-center gap-3">
            <span className="font-medium truncate">
              {student.fullName}
            </span>
            <span className="text-xs text-muted-foreground">
              {student.groupName || "Groupe inconnu"}
            </span>
          </div>
          <span className="text-sm font-medium text-warning">
            {student.absenceCount} absence{student.absenceCount !== 1 ? "s" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};