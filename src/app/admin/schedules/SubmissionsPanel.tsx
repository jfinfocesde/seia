'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSubmissionsByAttempt, getSubmissionDetails } from './actions';
import { SubmissionsTable } from './SubmissionsTable';
import { Button } from '@/components/ui/button';
import { SubmissionDetails } from './SubmissionDetails';

// --- Tipos explícitos para los datos ---
interface Question {
  text: string;
  type: 'CODE' | 'TEXT';
  language?: string;
}

interface Answer {
  id: number;
  question: Question;
  answer: string;
  score?: number | null;
}

interface Submission {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  score: number | null;
  submittedAt: Date | null;
}

interface FullSubmission extends Submission {
  answersList: Answer[];
}
// ------------------------------------

interface SubmissionsPanelProps {
  attemptId: number;
  onBack: () => void;
}

export function SubmissionsPanel({ attemptId, onBack }: SubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<FullSubmission | null>(null);

  useEffect(() => {
    getSubmissionsByAttempt(attemptId).then(data => setSubmissions(data as Submission[]));
  }, [attemptId]);

  const handleExportExcel = () => {
    const dataToExport = submissions.map(s => ({
      'Nombre': s.firstName,
      'Apellido': s.lastName,
      'Email': s.email,
      'Puntaje': s.score !== null ? s.score.toFixed(1) : 'N/A',
      'Fecha de envío': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'No enviado',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Envíos');
    XLSX.writeFile(workbook, 'reporte_envios.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre', 'Apellido', 'Email', 'Puntaje', 'Fecha de envío']],
      body: submissions.map(s => [
        s.firstName,
        s.lastName,
        s.email,
        s.score !== null ? s.score.toFixed(1) : 'N/A',
        s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'No enviado',
      ]),
    });
    doc.save('reporte_envios.pdf');
  };

  const handleViewDetails = async (submissionId: number) => {
    const details = await getSubmissionDetails(submissionId);
    setSelectedSubmission(details as FullSubmission);
  };

  const handleBackToSubmissions = () => {
    setSelectedSubmission(null);
  };

  if (selectedSubmission) {
    return <SubmissionDetails submission={selectedSubmission} onBack={handleBackToSubmissions} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={onBack} variant="outline">
          ← Volver a agendamientos
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} disabled={submissions.length === 0}>
            Descargar Excel
          </Button>
          <Button onClick={handleExportPDF} disabled={submissions.length === 0}>
            Descargar PDF
          </Button>
        </div>
      </div>
      <h2 className="text-xl font-bold mb-4">Envíos para el agendamiento</h2>
      <SubmissionsTable submissions={submissions} onViewDetails={handleViewDetails} />
    </div>
  );
} 