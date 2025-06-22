"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEvaluaciones } from '../evaluations/actions';

interface Evaluation {
  id: number;
  title: string;
}

interface ScheduleFormProps {
  onSave: (data: { evaluationId: number; uniqueCode: string; startTime: string; endTime: string; maxSubmissions?: number }) => void;
  onCancel: () => void;
  initialData?: {
    evaluationId: number;
    uniqueCode: string;
    startTime: string;
    endTime: string;
    maxSubmissions?: number;
  };
}

export function ScheduleForm({ onSave, onCancel, initialData }: ScheduleFormProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationId, setEvaluationId] = useState(initialData?.evaluationId || '');
  const [uniqueCode, setUniqueCode] = useState(initialData?.uniqueCode || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [maxSubmissions, setMaxSubmissions] = useState(initialData?.maxSubmissions || '');

  // Cargar evaluaciones al montar
  useEffect(() => {
    getEvaluaciones().then(setEvaluations);
  }, []);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({
          evaluationId: Number(evaluationId),
          uniqueCode,
          startTime,
          endTime,
          maxSubmissions: maxSubmissions ? Number(maxSubmissions) : undefined,
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1 font-medium">Evaluación</label>
        <select value={evaluationId} onChange={e => setEvaluationId(e.target.value)} required className="w-full border rounded p-2">
          <option value="">Selecciona una evaluación</option>
          {evaluations.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Código único</label>
        <Input value={uniqueCode} onChange={e => setUniqueCode(e.target.value)} required maxLength={8} />
      </div>
      <div>
        <label className="block mb-1 font-medium">Fecha y hora de inicio</label>
        <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1 font-medium">Fecha y hora de fin</label>
        <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1 font-medium">Máximo de presentaciones (opcional)</label>
        <Input type="number" value={maxSubmissions} onChange={e => setMaxSubmissions(e.target.value)} min={1} />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Guardar</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
} 