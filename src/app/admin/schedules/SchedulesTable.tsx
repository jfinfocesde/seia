'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Attempt {
  id: number;
  evaluationId: number;
  uniqueCode: string;
  startTime: Date;
  endTime: Date;
  maxSubmissions?: number | null;
  evaluation?: {
    title: string;
  };
  _count: {
    submissions: number;
  };
}

interface SchedulesTableProps {
  attempts: Attempt[];
  onEdit: (attempt: Attempt) => void;
  onDelete: (id: number) => void;
  onSubmissions: (id: number) => void;
  onStats: (id: number) => void;
}

export function SchedulesTable({ attempts, onEdit, onDelete, onSubmissions, onStats }: SchedulesTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
  };

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left w-1/6">Evaluación</th>
              <th className="p-2 text-left w-1/6">Código</th>
              <th className="p-2 text-left w-1/6">Inicio</th>
              <th className="p-2 text-left w-1/6">Fin</th>
              <th className="p-2 text-left w-1/12">Envíos</th>
              <th className="p-2 text-right w-1/4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a: Attempt) => (
              <tr key={a.id} className="border-b">
                <td className="p-2 font-medium">{a.evaluation?.title || '-'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span>{a.uniqueCode}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleCopy(a.uniqueCode)}
                    >
                      {copiedCode === a.uniqueCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
                <td className="p-2">{new Date(a.startTime).toLocaleString()}</td>
                <td className="p-2">{new Date(a.endTime).toLocaleString()}</td>
                <td className="p-2">{a._count.submissions}</td>
                <td className="p-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => onStats(a.id)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver estadísticas</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button variant="outline" size="sm" onClick={() => onEdit(a)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(a.id)}>
                      Eliminar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onSubmissions(a.id)}>
                      Envíos
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
} 