'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuestionGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

export function QuestionGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: QuestionGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerateClick = async () => {
    if (!prompt.trim()) return;
    
    setStatus('idle');
    setErrorMessage('');
    
    try {
      await onGenerate(prompt);
      setStatus('success');
      setPrompt(''); // Limpiar el prompt después de generar
      
      // Cerrar el modal después de un breve delay para mostrar el éxito
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al generar la pregunta');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    setPrompt('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generar Pregunta con IA
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ¡Pregunta generada exitosamente! Se ha copiado al editor.
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-muted-foreground">
            Escribe una idea o tema para la pregunta. La IA la convertirá en un enunciado formal en formato Markdown, teniendo en cuenta el tipo y lenguaje que hayas seleccionado.
          </p>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: una función en Javascript que sume dos números"
            className="min-h-[100px]"
            disabled={isGenerating || status === 'success'}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleGenerateClick} 
            disabled={isGenerating || !prompt.trim() || status === 'success'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                ¡Generado!
              </>
            ) : (
              'Generar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 