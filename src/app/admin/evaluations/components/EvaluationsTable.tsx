import { Button } from '@/components/ui/button';

export interface Evaluation {
  id: number;
  title: string;
  description?: string;
  helpUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationsTableProps {
  evaluations: Evaluation[];
  onEdit: (evaluation: Evaluation) => void;
  onDelete: (id: number) => void;
  onQuestions: (id: number) => void;
}

export function EvaluationsTable({ evaluations, onEdit, onDelete, onQuestions }: EvaluationsTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left w-1/4">Título</th>
            <th className="p-2 text-left w-1/2">Descripción</th>
            <th className="p-2 text-right w-1/4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((ev) => (
            <tr key={ev.id} className="border-b">
              <td className="p-2 font-medium">{ev.title}</td>
              <td className="p-2">{ev.description}</td>
              <td className="p-2 text-right">
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => onEdit(ev)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(ev.id)}>
                    Eliminar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onQuestions(ev.id)}>
                    Preguntas
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