'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { importEvaluacion } from '../actions';

interface ImportEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

export function ImportEvaluationModal({
  isOpen,
  onClose,
  onImport,
}: ImportEvaluationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setStatus('idle');
      setErrorMessage('');
    } else {
      setErrorMessage('Por favor selecciona un archivo JSON válido.');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validar estructura del JSON
      if (!data.title || !data.questions || !Array.isArray(data.questions)) {
        throw new Error('El archivo JSON no tiene la estructura correcta. Debe incluir "title" y "questions".');
      }

      // Importar la evaluación
      await importEvaluacion(data);
      
      setStatus('success');
      setFile(null);
      
      // Cerrar modal después de un delay
      setTimeout(() => {
        setStatus('idle');
        onImport();
        onClose();
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al importar la evaluación');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Evaluación
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ¡Evaluación importada exitosamente!
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
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo JSON que contenga una evaluación exportada.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isImporting || status === 'success'}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium">
                  {file ? file.name : 'Haz clic para seleccionar archivo JSON'}
                </span>
                <span className="text-xs text-gray-500">
                  Solo archivos JSON
                </span>
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isImporting || status === 'success'}
          >
            {isImporting ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                ¡Importado!
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 