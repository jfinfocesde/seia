'use client';
import { useEffect, useState } from 'react';
import { getAttempts, createAttempt, updateAttempt, deleteAttempt } from './actions';
import { ScheduleForm } from './ScheduleForm';
import { SchedulesTable } from './SchedulesTable';
import { Button } from '@/components/ui/button';
import { SubmissionsPanel } from './SubmissionsPanel';

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

export function SchedulesPanel() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAttempt, setEditAttempt] = useState<Attempt | null>(null);
  const [viewSubmissionsAttemptId, setViewSubmissionsAttemptId] = useState<number | null>(null);

  useEffect(() => {
    getAttempts().then((data) => setAttempts(data as Attempt[]));
  }, []);

  const handleCreate = () => {
    setEditAttempt(null);
    setShowForm(true);
  };

  const handleEdit = (attempt: Attempt) => {
    setEditAttempt(attempt);
    setShowForm(true);
  };

  const handleSave = async (data: { evaluationId: number; uniqueCode: string; startTime: string; endTime: string; maxSubmissions?: number }) => {
    if (editAttempt) {
      await updateAttempt(editAttempt.id, {
        uniqueCode: data.uniqueCode,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        maxSubmissions: data.maxSubmissions,
      });
    } else {
      await createAttempt({
        evaluationId: data.evaluationId,
        uniqueCode: data.uniqueCode,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        maxSubmissions: data.maxSubmissions,
      });
    }
    setShowForm(false);
    setEditAttempt(null);
    // Refrescar
    getAttempts().then(setAttempts);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditAttempt(null);
  };

  const handleDelete = async (id: number) => {
    await deleteAttempt(id);
    setAttempts(attempts.filter(a => a.id !== id));
  };

  const handleSubmissions = (id: number) => {
    setViewSubmissionsAttemptId(id);
  };

  const handleBackToSchedules = () => {
    setViewSubmissionsAttemptId(null);
  };

  if (viewSubmissionsAttemptId !== null) {
    return <SubmissionsPanel attemptId={viewSubmissionsAttemptId} onBack={handleBackToSchedules} />;
  }

  return (
    <div>
      {showForm ? (
        <ScheduleForm
          onSave={handleSave}
          onCancel={handleCancel}
          initialData={editAttempt ? {
            evaluationId: editAttempt.evaluationId,
            uniqueCode: editAttempt.uniqueCode,
            startTime: new Date(editAttempt.startTime).toISOString().slice(0, 16),
            endTime: new Date(editAttempt.endTime).toISOString().slice(0, 16),
            maxSubmissions: editAttempt.maxSubmissions ?? undefined,
          } : undefined}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Agendar presentaciones</h1>
            <Button onClick={handleCreate}>Agendar presentación</Button>
          </div>
          <SchedulesTable attempts={attempts} onEdit={handleEdit} onDelete={handleDelete} onSubmissions={handleSubmissions} />
        </>
      )}
    </div>
  );
} 