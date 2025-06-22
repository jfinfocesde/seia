import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface Evaluation {
  id?: number;
  title: string;
  description?: string;
  helpUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EvaluationFormProps {
  evaluation?: Evaluation;
  onSave: (evaluation: Evaluation) => void;
  onCancel: () => void;
}

export function EvaluationForm({ evaluation, onSave, onCancel }: EvaluationFormProps) {
  const [title, setTitle] = useState(evaluation?.title || '');
  const [description, setDescription] = useState(evaluation?.description || '');
  const [helpUrl, setHelpUrl] = useState(evaluation?.helpUrl || '');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({ ...evaluation, title, description, helpUrl });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1 font-medium">Título</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1 font-medium">Descripción</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1 font-medium">URL de ayuda</label>
        <Input value={helpUrl} onChange={e => setHelpUrl(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Guardar</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
} 