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