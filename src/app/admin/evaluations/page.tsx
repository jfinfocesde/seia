import { getEvaluaciones } from './actions';
import { EvaluationsPanel } from './EvaluationsPanel';
import { Evaluation } from './components/EvaluationsTable';

function normalizeEvaluation(ev: unknown): Evaluation {
  const e = ev as Partial<Evaluation>;
  return {
    id: e.id!,
    title: e.title!,
    description: e.description ?? '',
    helpUrl: e.helpUrl ?? '',
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt as unknown as Date).toISOString(),
    updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date(e.updatedAt as unknown as Date).toISOString(),
  };
}

export default async function AdminEvaluationsPage() {
  const evaluations = (await getEvaluaciones()).map(normalizeEvaluation);
  return (
    <div>
      <EvaluationsPanel initialEvaluations={evaluations} />
    </div>
  );
} 