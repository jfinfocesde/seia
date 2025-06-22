"use client";
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getPreguntasByEvaluacion, deletePregunta, createPregunta, updatePregunta } from '../actions';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { MarkdownViewer } from '@/app/student/evaluation/components/markdown-viewer';
import { QuestionDesigner } from './QuestionDesigner';

export interface Pregunta {
  id: number;
  text: string;
  type: string;
  language: string;
}

interface QuestionsPanelProps {
  evaluationId: number;
}

function normalizePregunta(p: unknown): Pregunta {
  const obj = p as Record<string, unknown>;
  return {
    id: Number(obj.id),
    text: String(obj.text ?? ''),
    type: String(obj.type ?? ''),
    language: String(obj.language ?? ''),
  };
}

export function QuestionsPanel({ evaluationId }: QuestionsPanelProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [previewPregunta, setPreviewPregunta] = useState<Pregunta | null>(null);
  const [editPregunta, setEditPregunta] = useState<Pregunta | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getPreguntasByEvaluacion(evaluationId);
      const normalized = data.map(normalizePregunta);
      setPreguntas(normalized);
    })();
  }, [evaluationId]);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleEdit = (pregunta: Pregunta) => {
    setEditPregunta(pregunta);
    setShowForm(true);
  };

  const handleSave = async (data: { text: string; type: 'TEXT' | 'CODE'; language?: string }) => {
    if (editPregunta) {
      await updatePregunta(editPregunta.id, {
        text: data.text,
        type: data.type,
        language: data.language,
        answer: '', 
      });
    } else {
      await createPregunta(evaluationId, {
        text: data.text,
        type: data.type,
        language: data.language,
        answer: '',
      });
    }
    setShowForm(false);
    setEditPregunta(null);
    // Refrescar preguntas
    const dataPregs = await getPreguntasByEvaluacion(evaluationId);
    const normalized = dataPregs.map(normalizePregunta);
    setPreguntas(normalized);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditPregunta(null);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setPreguntas(preguntas.filter(p => p.id !== id));
      deletePregunta(id);
    }
  };

  return (
    <>
      {showForm ? (
        <div className="mb-6">
          <QuestionDesigner
            initialData={editPregunta ? {
              id: editPregunta.id,
              text: editPregunta.text,
              type: editPregunta.type === 'code' ? 'CODE' : 'TEXT',
              language: editPregunta.language,
            } : undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            onTextChange={() => {}}
          />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Button onClick={handleCreate}>Agregar pregunta</Button>
          </div>
          <ul className="space-y-2">
            {preguntas.map((p, idx) => (
              <li key={p.id} className="border rounded p-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pregunta #{idx + 1}</span>
                    <span className="text-xs px-2 py-1 rounded bg-muted">{p.type === 'code' ? 'Código' : 'Texto'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setPreviewPregunta(p)}>Vista previa</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(p)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Eliminar</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {/* Modal de vista previa de pregunta */}
          <AlertDialog open={!!previewPregunta} onOpenChange={() => setPreviewPregunta(null)}>
            <AlertDialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full w-full z-50 border bg-background py-8 rounded-lg shadow-lg">
              <button
                className="absolute top-6 right-6 z-10 bg-muted hover:bg-muted/80 rounded-full p-2 text-lg font-bold shadow-md border border-border"
                onClick={() => setPreviewPregunta(null)}
                aria-label="Cerrar vista previa"
                type="button"
              >
                ×
              </button>
              <div className="min-h-[400px] w-full">
                <AlertDialogHeader>
                  <AlertDialogTitle>Vista previa de la pregunta</AlertDialogTitle>
                  <AlertDialogDescription>
                    {previewPregunta && (
                      <div className="my-6 p-6 bg-muted border rounded-xl shadow-lg min-h-[300px] max-h-[60vh] overflow-y-auto">
                        <MarkdownViewer content={previewPregunta.text} />
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
} 