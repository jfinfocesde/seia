import { Button } from "@/components/ui/button";

interface Submission {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  score: number | null;
  submittedAt: Date | null;
}

interface SubmissionsTableProps {
  submissions: Submission[];
  onViewDetails: (id: number) => void;
}

export function SubmissionsTable({ submissions, onViewDetails }: SubmissionsTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left w-1/4">Estudiante</th>
            <th className="p-2 text-left w-1/3">Email</th>
            <th className="p-2 text-left w-1/12">Puntaje</th>
            <th className="p-2 text-left w-1/4">Fecha de envío</th>
            <th className="p-2 text-right w-1/6">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2 font-medium">{s.firstName} {s.lastName}</td>
              <td className="p-2">{s.email}</td>
              <td className="p-2">{s.score !== null ? s.score.toFixed(1) : 'N/A'}</td>
              <td className="p-2">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'No enviado'}</td>
              <td className="p-2 text-right">
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => onViewDetails(s.id)}>
                    Ver Detalles
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 