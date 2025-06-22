"use server";
import prisma from '@/lib/prisma';

export async function getEvaluaciones() {
  return await prisma.evaluation.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEvaluacion(data: { title: string; description?: string; helpUrl?: string }) {
  return await prisma.evaluation.create({
    data,
  });
}

export async function updateEvaluacion(id: number, data: { title?: string; description?: string; helpUrl?: string }) {
  return await prisma.evaluation.update({
    where: { id },
    data,
  });
}

export async function deleteEvaluacion(id: number) {
  return await prisma.evaluation.delete({
    where: { id },
  });
}

// Función para obtener una evaluación completa con sus preguntas
export async function getEvaluacionCompleta(id: number) {
  const evaluacion = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return evaluacion;
}

// Función para importar una evaluación completa
export async function importEvaluacion(data: {
  title: string;
  description?: string;
  helpUrl?: string;
  questions: Array<{
    text: string;
    type: string;
    language?: string;
    answer?: string;
  }>;
}) {
  return await prisma.evaluation.create({
    data: {
      title: data.title,
      description: data.description,
      helpUrl: data.helpUrl,
      questions: {
        create: data.questions,
      },
    },
    include: {
      questions: true,
    },
  });
}

// Preguntas CRUD
export async function getPreguntasByEvaluacion(evaluationId: number) {
  return await prisma.question.findMany({
    where: { evaluationId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createPregunta(evaluationId: number, data: { text: string; type: string; language?: string; answer?: string }) {
  return await prisma.question.create({
    data: {
      evaluationId,
      text: data.text,
      type: data.type,
      language: data.language,
      answer: data.answer,
    },
  });
}

export async function updatePregunta(id: number, data: { text?: string; type?: string; language?: string; answer?: string }) {
  return await prisma.question.update({
    where: { id },
    data,
  });
}

export async function deletePregunta(id: number) {
  return await prisma.question.delete({
    where: { id },
  });
} 