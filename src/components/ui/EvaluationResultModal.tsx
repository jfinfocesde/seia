'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EvaluationResult {
  isCorrect: boolean;
  grade?: number;
  feedback: string;
}

interface EvaluationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: EvaluationResult | null;
}

export function EvaluationResultModal({ isOpen, onClose, result }: EvaluationResultModalProps) {
  if (!isOpen || !result) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-xl font-bold">
            Resultado de la Evaluación
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-center pt-4">
              <div className="bg-muted p-4 rounded-lg border text-sm text-left space-y-2">
                <p>
                  <strong>¿Correcto?</strong> {result.isCorrect ? 'Sí' : 'No'}
                </p>
                {result.grade !== undefined && (
                  <p>
                    <strong>Nota Asignada:</strong> {result.grade.toFixed(1)}
                  </p>
                )}
                <p>
                  <strong>Retroalimentación:</strong> {result.feedback}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 