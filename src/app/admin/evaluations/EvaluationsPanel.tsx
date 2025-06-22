"use client";
import { useState, useTransition } from 'react';
import { EvaluationsTable, Evaluation } from './components/EvaluationsTable';
import { EvaluationForm } from './components/EvaluationForm';
import { Button } from '@/components/ui/button';
import { createEvaluacion, updateEvaluacion, deleteEvaluacion, getEvaluacionCompleta } from './actions';
import { QuestionsPanel } from './components/QuestionsPanel';
import { ImportEvaluationModal } from './components/ImportEvaluationModal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Upload } from 'lucide-react';

interface EvaluationsPanelProps {
  initialEvaluations: Evaluation[];
}

function normalizeEvaluation(ev: unknown): Evaluation {
  const e = ev as Partial<Evaluation>;
  function toISOStringSafe(date: unknown): string {
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return '';
  }
  return {
    id: e.id!,
    title: e.title!,
    description: e.description ?? '',
    helpUrl: e.helpUrl ?? '',
    createdAt: toISOStringSafe(e.createdAt),
    updatedAt: toISOStringSafe(e.updatedAt),
  };
}

export function EvaluationsPanel({ initialEvaluations }: EvaluationsPanelProps) {
  const [evaluations, setEvaluations] = useState(initialEvaluations.map(normalizeEvaluation));
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();
  const [questionsEvalId, setQuestionsEvalId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (ev: Evaluation) => {
    setEditing(ev);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId !== null) {
      startTransition(async () => {
        await deleteEvaluacion(deleteId);
        setEvaluations(evaluations.filter(ev => ev.id !== deleteId));
        setDeleteId(null);
      });
    }
  };

  const cancelDelete = () => setDeleteId(null);

  const handleSubmit = (data: { title: string; description?: string; helpUrl?: string }) => {
    startTransition(async () => {
      if (editing) {
        const updated = normalizeEvaluation(await updateEvaluacion(editing.id, data));
        setEvaluations(evaluations.map(ev => (ev.id === editing.id ? updated : ev)));
      } else {
        const created = normalizeEvaluation(await createEvaluacion(data));
        setEvaluations([created, ...evaluations]);
      }
      setShowForm(false);
      setEditing(null);
    });
  };

  const handleExport = async (evaluationId: number) => {
    try {
      const evaluacionCompleta = await getEvaluacionCompleta(evaluationId);
      if (!evaluacionCompleta) {
        alert('No se pudo obtener la evaluación');
        return;
      }

      // Preparar datos para exportar (sin IDs internos)
      const exportData = {
        title: evaluacionCompleta.title,
        description: evaluacionCompleta.description,
        helpUrl: evaluacionCompleta.helpUrl,
        questions: evaluacionCompleta.questions.map(q => ({
          text: q.text,
          type: q.type,
          language: q.language,
          answer: q.answer,
        })),
      };

      // Crear y descargar archivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${evaluacionCompleta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_evaluacion.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar la evaluación');
    }
  };

  const handleImportSuccess = () => {
    // Recargar las evaluaciones después de importar
    window.location.reload();
  };

  return (
    <div>
      {/* Modal de confirmación para eliminar evaluación */}
      <AlertDialog open={deleteId !== null} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta evaluación y todas sus preguntas asociadas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de importación */}
      <ImportEvaluationModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSuccess}
      />

      {questionsEvalId ? (
        <div>
          <Button className="mb-4" variant="outline" onClick={() => setQuestionsEvalId(null)}>
            ← Volver a evaluaciones
          </Button>
          <QuestionsPanel evaluationId={questionsEvalId} />
        </div>
      ) : showForm ? (
        <EvaluationForm
          evaluation={editing || undefined}
          onSave={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Evaluaciones</h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowImportModal(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button onClick={handleCreate}>Crear nueva evaluación</Button>
            </div>
          </div>
          <EvaluationsTable
            evaluations={evaluations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQuestions={setQuestionsEvalId}
            onExport={handleExport}
          />
        </>
      )}
    </div>
  );
} 