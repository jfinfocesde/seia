'use client';
import { useEffect, useState } from 'react';
import { getAttempts, createAttempt, updateAttempt, deleteAttempt, generateAndGetScheduleAnalysis, getDetailedAttemptData } from './actions';
import { ScheduleForm } from './ScheduleForm';
import { SchedulesTable } from './SchedulesTable';
import { Button } from '@/components/ui/button';
import { SubmissionsPanel } from './SubmissionsPanel';
import { AttemptStatsPage } from './components/AttemptStatsPage';
import { generatePdfReport } from '@/lib/pdf-generator';
import { generateQuestionsPdf } from '@/lib/questions-pdf-generator';
import { generateRiskPrediction, generateQuestionBiasAnalysis, generateParticipationAnalysis, generatePlagiarismAnalysis, wordMatchSimilarity, generatePersonalizedRecommendations, generateSentimentAnalysis, generateDifficultyHeatmap } from '@/lib/gemini-schedule-analysis';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

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

// Tipos explícitos para respuestas y preguntas
interface SimpleAnswer { answer: string; score: number | null; question: { text: string } }
interface Submission { firstName: string; lastName: string; score?: number | null; fraudAttempts: number; timeOutsideEval: number; answersList: SimpleAnswer[] }

export function SchedulesPanel() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAttempt, setEditAttempt] = useState<Attempt | null>(null);
  const [viewSubmissionsAttemptId, setViewSubmissionsAttemptId] = useState<number | null>(null);
  const [viewStatsAttemptId, setViewStatsAttemptId] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<number | null>(null);
  const [showSectionSelector, setShowSectionSelector] = useState<null | number>(null);
  const [selectedSections, setSelectedSections] = useState({
    general: false,
    risk: false,
    bias: false,
    participation: false,
    plagiarismText: false,
    plagiarismCode: false,
    personalized: false,
    sentiment: false,
    difficultyHeatmap: false,
    tablaAnalisisPregunta: false,
    tablaRanking: false,
    tablaParticipacion: false,
    tablaPlagioText: false,
    tablaPlagioCode: false,
  });
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string; details?: string }>({ open: false, message: '', details: '' });
  const [selectedGeminiOption, setSelectedGeminiOption] = useState<keyof typeof selectedSections | null>(null);

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

  const handleStats = (id: number) => {
    setViewStatsAttemptId(id);
  };

  const handleOpenSectionSelector = (id: number) => {
    setShowSectionSelector(id);
  };

  // Opciones exclusivas de análisis Gemini (solo radio)
  const geminiOptions: { key: keyof typeof selectedSections; label: string; description?: string }[] = [
    { key: 'risk', label: 'Predicción de riesgo de bajo rendimiento' },
    { key: 'bias', label: 'Sesgos en preguntas' },
    { key: 'participation', label: 'Participación y compromiso' },
    { key: 'plagiarismText', label: 'Plagio/similitud en preguntas de texto' },
    { key: 'plagiarismCode', label: 'Plagio/similitud en preguntas de código' },
    { key: 'personalized', label: 'Recomendaciones personalizadas por estudiante' },
    { key: 'sentiment', label: 'Análisis de Sentimiento en Respuestas Abiertas', description: 'Analiza el tono y sentimiento de las respuestas abiertas para detectar frustración, motivación, etc. Útil para ajustar la dificultad o el acompañamiento emocional en el curso. (Solo aplica a preguntas de texto)' },
    { key: 'difficultyHeatmap', label: 'Mapa de Calor de Dificultad por Temas', description: 'Visualizar en qué temas o competencias hay más errores o menor rendimiento para enfocar la retroalimentación y la mejora curricular.' },
  ];

  // Cambia la selección para que solo una opción Gemini esté activa a la vez
  const handleGeminiChange = (key: keyof typeof selectedSections) => {
    setSelectedGeminiOption(key);
    setSelectedSections(prev => {
      const newSections = { ...prev };
      geminiOptions.forEach(opt => { newSections[opt.key] = false; });
      newSections[key] = true;
      return newSections;
    });
  };

  const handleSectionChange = (key: keyof typeof selectedSections, value: boolean) => {
    setSelectedSections(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirmSections = () => {
    if (showSectionSelector !== null) {
      handleGenerateReport(showSectionSelector, { ...selectedSections });
      setShowSectionSelector(null);
    }
  };

  const handleGenerateReport = async (id: number, sections: Record<string, boolean>) => {
    setIsGeneratingReport(id);
    try {
      const { attempt, questionAnalysis } = await getDetailedAttemptData(id);
      const analysisResult = await generateAndGetScheduleAnalysis(id);

      // Solo calcular stdDev si la tabla de análisis por pregunta está seleccionada
      let questionStats: { questionText: string; averageScore: number; stdDev: number }[] = [];
      if (sections.tablaAnalisisPregunta) {
        questionStats = questionAnalysis.map(q => {
          const scores: number[] = [];
          attempt.submissions.forEach((sub: Submission) => {
            if (sub.answersList) {
              const ans = sub.answersList.find((a: SimpleAnswer) => a.question?.text === q.text);
              if (ans && typeof ans.score === 'number') {
                scores.push(ans.score);
              }
            }
          });
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const stdDev = scores.length > 1 ? Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (scores.length - 1)) : 0;
          return {
            questionText: '', // Nunca pasar el texto
            averageScore: avg,
            stdDev,
          };
        });
      }

      // Solo llamar a Gemini para las secciones seleccionadas
      let riskPrediction, questionBias, participationAnalysis, plagiarismPairsText, plagiarismAnalysisText, plagiarismPairsCode, plagiarismAnalysisCode, personalizedRecommendations, sentimentAnalysis, difficultyHeatmap;

      if (sections.risk) {
        const submissions = attempt.submissions.map(s => ({
          studentName: `${s.firstName} ${s.lastName}`,
          score: s.score,
          fraudAttempts: s.fraudAttempts,
          timeOutsideEval: s.timeOutsideEval,
        }));
        riskPrediction = await generateRiskPrediction(attempt.evaluation.title, submissions);
      }
      if (sections.bias) {
        questionBias = await generateQuestionBiasAnalysis(questionStats);
      }
      if (sections.participation) {
        const participationData = attempt.submissions.map(s => ({
          studentName: `${s.firstName} ${s.lastName}`,
          score: s.score,
          timeOutsideEval: s.timeOutsideEval,
        }));
        participationAnalysis = await generateParticipationAnalysis(participationData);
      }
      if (sections.plagiarismText || sections.plagiarismCode) {
        plagiarismPairsText = [];
        plagiarismPairsCode = [];
        for (const q of questionAnalysis) {
          const answers = attempt.submissions.map((s: Submission) => {
            const ans = s.answersList?.find((a: SimpleAnswer) => a.question?.text === q.text);
            return {
              studentName: `${s.firstName} ${s.lastName}`,
              answer: ans?.answer ?? '',
            };
          });
          for (let i = 0; i < answers.length; i++) {
            for (let j = i + 1; j < answers.length; j++) {
              const a1 = answers[i];
              const a2 = answers[j];
              if (a1.answer.length >= 20 && a2.answer.length >= 20) {
                const sim = wordMatchSimilarity(a1.answer, a2.answer);
                if (sim > 0.8) {
                  if (q.type === 'TEXT' && sections.plagiarismText) {
                    plagiarismPairsText.push({
                      studentA: a1.studentName,
                      studentB: a2.studentName,
                      questionText: '', // Nunca pasar el texto
                      similarity: sim,
                    });
                  } else if (q.type === 'CODE' && sections.plagiarismCode) {
                    plagiarismPairsCode.push({
                      studentA: a1.studentName,
                      studentB: a2.studentName,
                      questionText: '', // Nunca pasar el texto
                      similarity: sim,
                    });
                  }
                }
              }
            }
          }
        }
        if (sections.plagiarismText && plagiarismPairsText.length > 0) {
          plagiarismAnalysisText = await generatePlagiarismAnalysis(plagiarismPairsText);
        }
        if (sections.plagiarismCode && plagiarismPairsCode.length > 0) {
          plagiarismAnalysisCode = await generatePlagiarismAnalysis(plagiarismPairsCode);
        }
      }
      if (sections.personalized) {
        const studentsData = attempt.submissions.map((s: Submission) => ({
          studentName: `${s.firstName} ${s.lastName}`,
          score: s.score ?? null,
          answers: (s.answersList || []).map((a: SimpleAnswer, idx: number) => ({
            questionText: '', // Nunca pasar el texto
            answer: a.answer ?? '',
            score: a.score ?? null,
            number: idx + 1,
          })),
          fraudAttempts: s.fraudAttempts,
          timeOutsideEval: s.timeOutsideEval,
        }));
        personalizedRecommendations = await generatePersonalizedRecommendations(studentsData);
      }
      if (sections.sentiment) {
        // Recolectar todas las respuestas de texto
        const textResponses: { studentName: string; questionText: string; answer: string }[] = [];
        attempt.submissions.forEach(sub => {
          (sub.answersList || []).forEach(ans => {
            if (ans.question?.type === 'TEXT' && ans.answer && ans.answer.trim().length > 0) {
              textResponses.push({
                studentName: `${sub.firstName} ${sub.lastName}`,
                questionText: ans.question.text,
                answer: ans.answer,
              });
            }
          });
        });
        if (textResponses.length === 0) {
          setErrorModal({
            open: true,
            message: 'No hay respuestas de preguntas de tipo texto para analizar el sentimiento.',
            details: 'El análisis de sentimiento solo se puede aplicar si existen respuestas abiertas (texto) en la evaluación.',
          });
          setIsGeneratingReport(null);
          return;
        }
        sentimentAnalysis = await generateSentimentAnalysis(textResponses);
      }
      if (sections.difficultyHeatmap) {
        if (questionAnalysis.length > 0) {
          difficultyHeatmap = await generateDifficultyHeatmap(questionAnalysis.map(q => ({
            text: q.text,
            averageScore: q.averageScore,
          })));
        }
      }

      // Generar PDF con todas las secciones seleccionadas
      generatePdfReport(
        analysisResult,
        attempt,
        questionAnalysis.map(q => ({ ...q, text: '' })),
        riskPrediction,
        questionBias,
        participationAnalysis,
        plagiarismPairsText,
        plagiarismAnalysisText,
        plagiarismPairsCode,
        plagiarismAnalysisCode,
        personalizedRecommendations,
        sentimentAnalysis,
        difficultyHeatmap,
        sections
      );
    } catch (error: unknown) {
      console.error("Error generating report:", error);
      let details = 'Error desconocido';
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string') {
        details = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        details = error;
      } else if (error) {
        details = String(error);
      }
      setErrorModal({
        open: true,
        message: 'Hubo un error al generar el reporte.',
        details,
      });
    } finally {
      setIsGeneratingReport(null);
    }
  };

  const handleBackToSchedules = () => {
    setViewSubmissionsAttemptId(null);
    setViewStatsAttemptId(null);
  };

  const handleDownloadQuestionsPdf = async (attemptId: number) => {
    // Obtener preguntas de la evaluación
    const { attempt } = await getDetailedAttemptData(attemptId);
    // Suponiendo que todas las preguntas están en attempt.evaluation.questions
    // Si no, deberás obtenerlas de la fuente correcta
    // Aquí asumo que questionAnalysis contiene todas las preguntas
    const { questionAnalysis } = await getDetailedAttemptData(attemptId);
    const questions = questionAnalysis.map((q: { text: string }, i: number) => ({
      number: i + 1,
      text: q.text,
    }));
    generateQuestionsPdf(questions, attempt.evaluation.title);
  };

  if (viewSubmissionsAttemptId !== null) {
    return <SubmissionsPanel attemptId={viewSubmissionsAttemptId} onBack={handleBackToSchedules} />;
  }

  if (viewStatsAttemptId !== null) {
    const selectedAttempt = attempts.find(a => a.id === viewStatsAttemptId);
    if (selectedAttempt) {
      return <AttemptStatsPage attempt={selectedAttempt} onBack={handleBackToSchedules} />;
    }
  }

  return (
    <div>
      {/* Modal de error de generación de informe */}
      <Dialog open={errorModal.open} onOpenChange={v => setErrorModal(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error al generar el informe</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {errorModal.message}
            <br />
            <span className="text-xs text-red-500 break-all">{errorModal.details}</span>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      {/* Modal de selección de secciones */}
      <Dialog open={showSectionSelector !== null} onOpenChange={v => !v && setShowSectionSelector(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecciona las secciones a incluir en el reporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Checkbox checked={selectedSections.general} onCheckedChange={v => handleSectionChange('general', !!v)} id="general" />
              <label htmlFor="general" className="ml-2">Análisis general</label>
            </div>
            <div role="radiogroup" aria-label="Opciones de análisis IA">
              {geminiOptions.map(opt => (
                <div key={opt.key} className="flex flex-col space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={opt.key}
                      name="geminiOption"
                      value={opt.key}
                      checked={selectedGeminiOption === opt.key}
                      onChange={() => handleGeminiChange(opt.key)}
                      className="accent-blue-600 size-4"
                    />
                    <label htmlFor={opt.key} className="ml-2 cursor-pointer">{opt.label}</label>
                  </div>
                  {opt.description && (
                    <span className="ml-7 text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 font-semibold">Tablas (opcional):</div>
            <div>
              <Checkbox checked={selectedSections.tablaAnalisisPregunta} onCheckedChange={v => handleSectionChange('tablaAnalisisPregunta', !!v)} id="tablaAnalisisPregunta" />
              <label htmlFor="tablaAnalisisPregunta" className="ml-2">Tabla de análisis por pregunta</label>
            </div>
            <div>
              <Checkbox checked={selectedSections.tablaRanking} onCheckedChange={v => handleSectionChange('tablaRanking', !!v)} id="tablaRanking" />
              <label htmlFor="tablaRanking" className="ml-2">Tabla de ranking de participantes</label>
            </div>
            <div>
              <Checkbox checked={selectedSections.tablaParticipacion} onCheckedChange={v => handleSectionChange('tablaParticipacion', !!v)} id="tablaParticipacion" />
              <label htmlFor="tablaParticipacion" className="ml-2">Tabla de participación y compromiso</label>
            </div>
            <div>
              <Checkbox checked={selectedSections.tablaPlagioText} onCheckedChange={v => handleSectionChange('tablaPlagioText', !!v)} id="tablaPlagioText" />
              <label htmlFor="tablaPlagioText" className="ml-2">Tabla de plagio/similitud en texto</label>
            </div>
            <div>
              <Checkbox checked={selectedSections.tablaPlagioCode} onCheckedChange={v => handleSectionChange('tablaPlagioCode', !!v)} id="tablaPlagioCode" />
              <label htmlFor="tablaPlagioCode" className="ml-2">Tabla de plagio/similitud en código</label>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleConfirmSections} disabled={isGeneratingReport !== null}>Generar Reporte</Button>
          </div>
        </DialogContent>
      </Dialog>
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
          <SchedulesTable 
            attempts={attempts} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onSubmissions={handleSubmissions}
            onStats={handleStats}
            onGenerateReport={handleOpenSectionSelector}
            isGeneratingReport={isGeneratingReport}
            onDownloadQuestionsPdf={handleDownloadQuestionsPdf}
          />
        </>
      )}
    </div>
  );
} 