"use server";
import prisma from '@/lib/prisma';
import { generateScheduleAnalysis, ScheduleAnalysisResult } from '@/lib/gemini-schedule-analysis';

export async function getAttempts() {
  return await prisma.attempt.findMany({
    include: { 
      evaluation: true,
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { startTime: 'desc' },
  });
}

export async function createAttempt(data: { evaluationId: number; uniqueCode: string; startTime: Date; endTime: Date; maxSubmissions?: number }) {
  return await prisma.attempt.create({
    data,
  });
}

export async function updateAttempt(id: number, data: { uniqueCode?: string; startTime?: Date; endTime?: Date; maxSubmissions?: number }) {
  return await prisma.attempt.update({
    where: { id },
    data,
  });
}

export async function deleteAttempt(id: number) {
  return await prisma.attempt.delete({
    where: { id },
  });
}

export async function getSubmissionsByAttempt(attemptId: number) {
  return await prisma.submission.findMany({
    where: { attemptId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function getSubmissionDetails(submissionId: number) {
  return await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      answersList: {
        include: {
          question: true,
        },
      },
    },
  });
}

export async function getQuestionAnalysis(attemptId: number) {
  const answers = await prisma.answer.findMany({
    where: {
      submission: {
        attemptId: attemptId,
      },
      score: {
        not: null,
      },
    },
    include: {
      question: {
        select: {
          id: true,
          text: true,
          type: true,
        },
      },
    },
  });

  if (answers.length === 0) {
    return [];
  }

  const analysis = new Map<number, { question: { id: number; text: string; type: string; }; scores: number[]; count: number }>();

  answers.forEach(answer => {
    if (!analysis.has(answer.question.id)) {
      analysis.set(answer.question.id, {
        question: answer.question,
        scores: [],
        count: 0,
      });
    }
    const questionData = analysis.get(answer.question.id)!;
    questionData.scores.push(answer.score!);
    questionData.count++;
  });

  const results = Array.from(analysis.values()).map(({ question, scores }) => {
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return {
      questionId: question.id,
      text: question.text,
      type: question.type,
      averageScore: averageScore,
    };
  });

  return results;
}

export async function getDetailedAttemptData(attemptId: number) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      evaluation: {
        select: { title: true },
      },
      submissions: {
        select: {
          firstName: true,
          lastName: true,
          score: true,
          fraudAttempts: true,
          timeOutsideEval: true,
          createdAt: true,
          submittedAt: true,
          answersList: {
            select: {
              answer: true,
              score: true,
              question: {
                select: { text: true, type: true },
              },
            },
          },
        },
        orderBy: {
          score: 'desc',
        },
      },
    },
  });

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  const questionAnalysisData = await getQuestionAnalysis(attemptId);

  return {
    attempt,
    questionAnalysis: questionAnalysisData,
  };
}

export async function generateAndGetScheduleAnalysis(attemptId: number): Promise<ScheduleAnalysisResult> {
    const { attempt, questionAnalysis } = await getDetailedAttemptData(attemptId);

    const stats = {
        totalSubmissions: attempt.submissions.length,
        averageScore: attempt.submissions.filter(s => s.score !== null).length > 0 
            ? attempt.submissions.filter(s => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / attempt.submissions.filter(s => s.score !== null).length
            : 0,
        totalFraudAttempts: attempt.submissions.reduce((acc, s) => acc + s.fraudAttempts, 0),
        gradeDistribution: [
             { name: 'Excelente (4.5-5.0)', value: attempt.submissions.filter(s => s.score !== null && (s.score || 0) >= 4.5).length },
             { name: 'Muy Bueno (4.0-4.4)', value: attempt.submissions.filter(s => s.score !== null && (s.score || 0) >= 4.0 && (s.score || 0) < 4.5).length },
             { name: 'Bueno (3.5-3.9)', value: attempt.submissions.filter(s => s.score !== null && (s.score || 0) >= 3.5 && (s.score || 0) < 4.0).length },
             { name: 'Regular (3.0-3.4)', value: attempt.submissions.filter(s => s.score !== null && (s.score || 0) >= 3.0 && (s.score || 0) < 3.5).length },
             { name: 'Insuficiente (0.0-2.9)', value: attempt.submissions.filter(s => s.score !== null && (s.score || 0) < 3.0).length },
             { name: 'Sin calificar', value: attempt.submissions.filter(s => s.score === null).length },
        ].filter(item => item.value > 0),
    };

    const submissionSummaries = attempt.submissions.map(s => ({
        studentName: `${s.firstName} ${s.lastName}`,
        score: s.score,
        fraudAttempts: s.fraudAttempts,
        timeOutsideEval: s.timeOutsideEval,
    }));

    const questionAnalysisSummaries = questionAnalysis.map(qa => ({
        questionText: qa.text,
        averageScore: qa.averageScore,
        questionType: qa.type,
    }));

    const analysis = await generateScheduleAnalysis(
        attempt.evaluation.title,
        stats,
        submissionSummaries,
        questionAnalysisSummaries,
    );

    return analysis;
}

export async function getStudentScoreHistory(attemptId: number) {
  // Obtener los estudiantes de este agendamiento
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      submissions: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
  if (!attempt) throw new Error('Attempt not found');

  // Para cada estudiante, buscar su historial de notas en todas las submissions
  const students = attempt.submissions.map(s => ({
    name: `${s.firstName} ${s.lastName}`,
    email: s.email,
  }));

  // Buscar historial por email (más robusto)
  const histories = await Promise.all(students.map(async (student) => {
    const submissions = await prisma.submission.findMany({
      where: { email: student.email },
      include: {
        attempt: {
          select: { startTime: true, evaluation: { select: { title: true } } },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return {
      studentName: student.name,
      email: student.email,
      history: submissions.map(sub => ({
        evaluationTitle: sub.attempt.evaluation?.title || '-',
        date: sub.attempt.startTime,
        score: sub.score,
      })),
    };
  }));

  return histories;
} 