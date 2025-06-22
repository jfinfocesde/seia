"use server";
import prisma from '@/lib/prisma';

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