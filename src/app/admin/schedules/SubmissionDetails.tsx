'use client';

import { Button } from "@/components/ui/button";
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from 'next-themes';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { FileSpreadsheet, FileText } from "lucide-react";

// Definición de tipos para el componente
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
  firstName: string;
  lastName: string;
  email: string;
  score?: number | null;
  answersList: Answer[];
}

interface SubmissionDetailsProps {
  submission: Submission | null;
  onBack: () => void;
}

/**
 * Componente para mostrar los detalles de un envío, incluyendo
 * las respuestas del estudiante a cada pregunta.
 */
export function SubmissionDetails({ submission, onBack }: SubmissionDetailsProps) {
  const { theme } = useTheme();

  const handleExportExcel = () => {
    if (!submission) return;

    // Información del estudiante para la cabecera
    const studentInfo = [
        ['Estudiante:', `${submission.firstName} ${submission.lastName}`],
        ['Email:', submission.email],
        ['Puntaje Total:', `${submission.score ?? 'Sin calificar'}`],
        [] // Fila en blanco como separador
    ];

    // Crear la hoja de cálculo a partir de la información del estudiante
    const worksheet = XLSX.utils.aoa_to_sheet(studentInfo);

    // Datos principales de preguntas y puntuaciones
    const dataToExport = submission.answersList.map((ans, index) => ({
        '#': `Pregunta #${index + 1}`,
        'Puntuación': ans.score ?? 'Sin calificar'
    }));

    // Añadir los datos principales a la hoja existente, después de la cabecera
    XLSX.utils.sheet_add_json(worksheet, dataToExport, {
        origin: 'A5', // Empezar en la celda A5
        skipHeader: false
    });


    // Ajustar el ancho de las columnas
    const columnWidths = [
        { wch: 20 }, // Ancho para la columna #
        { wch: 15 }  // Ancho para la columna de Puntuación
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen de Calificaciones');
    
    const studentName = `${submission.firstName}_${submission.lastName}`;
    XLSX.writeFile(workbook, `calificaciones_${studentName}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!submission) return;

    const doc = new jsPDF();
    doc.setFont('Times');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = margin;
    let pageNumber = 1;

    const colors = {
        primary: [47, 85, 212] as const,
        text: [55, 65, 81] as const,
        heading: [17, 24, 39] as const,
        lightGray: [249, 250, 251] as const,
        border: [229, 231, 235] as const
    };

    const addPage = () => {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.addPage();
        y = margin;
        pageNumber++;

        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 22, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont('Times', 'bold');
        doc.text('Reporte de Evaluación - SEIA', margin, 15);
        y = 35;
    };

    const addPageIfNeeded = (spaceNeeded: number) => {
        if (y + spaceNeeded > pageHeight - 20) {
            addPage();
        }
    };

    // --- PDF Header ---
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('Times', 'bold');
    doc.text('Reporte de Evaluación - SEIA', margin, 15);
    y = 40;

    // --- Student Info ---
    doc.setFontSize(16);
    doc.setFont('Times', 'bold');
    doc.setTextColor(...colors.heading);
    doc.text('Información del Estudiante', margin, y);
    y += 10;
    doc.setFontSize(11);
    doc.setFont('Times', 'normal');
    doc.setTextColor(...colors.text);
    const studentInfo = [
        `Nombre: ${submission.firstName} ${submission.lastName}`,
        `Email: ${submission.email}`,
        `Puntaje Final: ${submission.score ?? 'Sin calificar'}`,
    ];
    doc.text(studentInfo, margin, y);
    y += studentInfo.length * 7 + 10;

    // --- Markdown Renderer ---
    const renderMarkdown = (text: string) => {
        if (!text || text.trim() === '') {
            addPageIfNeeded(10);
            doc.setFontSize(10);
            doc.setFont('Times', 'italic');
            doc.setTextColor(150, 150, 150);
            doc.text('(Sin respuesta)', margin + 5, y);
            y += 8;
            return;
        }

        const lines = text.split('\\n');
        let inCodeBlock = false;
        let codeContent: string[] = [];

        const flushCodeBlock = () => {
            if (codeContent.length > 0) {
                addPageIfNeeded(20);
                const codeText = codeContent.join('\\n');
                
                doc.setFillColor(41, 51, 64);
                doc.setFont('Courier', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(220, 222, 224);

                const splitCode = doc.splitTextToSize(codeText, pageWidth - (margin * 2) - 20);
                const blockHeight = (splitCode.length * 4.5) + 10;
                addPageIfNeeded(blockHeight);
                doc.roundedRect(margin + 5, y, pageWidth - (margin * 2) - 10, blockHeight, 3, 3, 'F');
                doc.text(splitCode, margin + 10, y + 8);
                y += blockHeight + 5;
                codeContent = [];
            }
        };

        lines.forEach(line => {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                if (!inCodeBlock) flushCodeBlock();
                return;
            }

            if (inCodeBlock) {
                codeContent.push(line);
                return;
            }

            const headingMatch = line.match(/^(#+)\s+(.*)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = headingMatch[2];
                
                const fontSize = Math.max(16 - (level - 1) * 2, 10);
                addPageIfNeeded(10);
                doc.setFontSize(fontSize);
                doc.setFont('Times', 'bold');
                doc.setTextColor(...colors.heading);
                
                const splitText = doc.splitTextToSize(content, pageWidth - (margin * 2) - 10);
                doc.text(splitText, margin + 5, y);
                y += splitText.length * (fontSize / 2) + 4;
                return;
            }

            const isList = line.trim().startsWith('* ') || line.trim().startsWith('- ');
            const content = isList ? line.trim().substring(2) : line;
            const xPos = isList ? margin + 10 : margin + 5;

            doc.setFontSize(10);
            doc.setFont('Times', 'normal');
            doc.setTextColor(...colors.text);

            const splitText = doc.splitTextToSize(content, pageWidth - xPos - margin);
            addPageIfNeeded(splitText.length * 5 + 4);

            if (isList) {
                doc.circle(margin + 7, y + 2, 1, 'F');
            }
            doc.text(splitText, xPos, y);
            y += splitText.length * 5 + 2;
        });
        flushCodeBlock();
    };

    // --- Loop through Questions ---
    submission.answersList.forEach((ans, index) => {
        addPageIfNeeded(60);
        
        // Question Title
        doc.setFontSize(13);
        doc.setFont('Times', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text(`Pregunta #${index + 1}`, margin, y);
        y += 10;

        // Question Text
        renderMarkdown(ans.question.text);
        y += 8;

        doc.setFontSize(12);
        doc.setFont('Times', 'bold');
        doc.setTextColor(...colors.heading);
        doc.text('Respuesta del Estudiante', margin, y);
        y += 8;
        
        if (ans.question.type === 'CODE') {
            renderMarkdown(`\`\`\`${ans.question.language || ''}\\n${ans.answer.trim()}\\n\`\`\``);
        } else {
            renderMarkdown(ans.answer.trim());
        }
        y += 8;
        
        doc.setFontSize(11);
        doc.setFont('Times', 'bold');
        doc.setTextColor(...colors.heading);
        doc.text(`Puntaje: ${ans.score ?? 'Sin calificar'}`, margin, y);
        y += 5;

        if (index < submission.answersList.length - 1) {
            y += 10;
            addPageIfNeeded(10);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;
            doc.setLineWidth(0.2); // Reset line width
        }
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('Times', 'normal');
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save(`reporte_${submission.email}.pdf`);
  };

  if (!submission) {
    return (
      <div>
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Volver
        </Button>
        <p>No hay datos de envío para mostrar.</p>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={onBack} variant="outline" className="mb-4">
        ← Volver a la lista de envíos
      </Button>
      
      <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="flex-1">
              <h2 className="text-2xl font-bold">Detalles del Envío</h2>
              <div className="mt-2 text-sm text-muted-foreground">
                  <p><strong>Estudiante:</strong> {submission.firstName} {submission.lastName}</p>
                  <p><strong>Email:</strong> {submission.email}</p>
                  <p><strong>Puntaje Total:</strong> {submission.score ?? 'Sin calificar'}</p>
              </div>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Descargar Excel
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar PDF
              </Button>
          </div>
      </div>

      {/* Contenedor principal para la lista de preguntas y respuestas */}
      <main className="space-y-8">
        {submission.answersList.map((answer, index) => (
          <section key={answer.id} className="border rounded-lg p-4 bg-card shadow-sm">
            <h3 className="font-bold text-lg mb-4">Pregunta #{index + 1}</h3>
            
            <div
              data-color-mode={theme}
            >
              <MDEditor.Markdown source={answer.question.text} style={{ padding: '1rem', background: 'transparent' }} />
            </div>

            <div>
              <h4 className="font-semibold mb-2">Respuesta del Estudiante</h4>
              {answer.question.type === 'CODE' ? (
                <div data-color-mode={theme}>
                  <MDEditor.Markdown 
                    source={`\`\`\`${answer.question.language || 'plaintext'}\n${answer.answer.trim()}\n\`\`\``}
                    style={{ padding: '1rem', background: 'transparent' }}
                  />
                </div>
              ) : (
                answer.answer.trim() ? (
                  <pre className="w-full whitespace-pre-wrap rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                    {answer.answer.trim()}
                  </pre>
                ) : (
                  <div className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground italic">
                    (El estudiante no respondió.)
                  </div>
                )
              )}
            </div>

            {answer.score !== null && (
              <p className="mt-4 font-semibold text-right">Puntaje de la respuesta: {answer.score}</p>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
