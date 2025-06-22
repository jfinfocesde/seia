import { GoogleGenAI } from "@google/genai";

/**
 * Generates a question in Markdown format using the Gemini API.
 * 
 * @param userPrompt The user's prompt describing the question to be generated.
 * @param questionType The type of question ('CODE' or 'TEXT').
 * @param language The programming language for code questions (e.g., 'javascript').
 * @returns The generated question as a Markdown string.
 */
export async function generateQuestion(userPrompt: string, questionType: 'CODE' | 'TEXT', language?: string): Promise<string> {
  try {
    console.log('🔧 Iniciando generación de pregunta...');
    console.log('📝 Parámetros:', { userPrompt, questionType, language });

    // Inicializar la API de Google Gemini   
    const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!API_KEY) {
      console.error('API_KEY no configurada para Google Gemini');
      throw new Error('Error de configuración del sistema. Contacta al administrador.');
    }

    console.log('🔑 API Key configurada:', !!API_KEY);

    const genAI = new GoogleGenAI({ apiKey: API_KEY });
    
    // Usar el modelo gemini-2.0-flash 
    const model = "gemini-2.0-flash";

    console.log('🤖 Modelo:', model);

    const typeInstruction = questionType === 'CODE' 
      ? `Genera una pregunta de programación. El lenguaje de programación es: ${language || 'desconocido'}. La pregunta debe pedir al estudiante que escriba una función o un fragmento de código. La descripción debe ser clara y concisa.`
      : `Genera una pregunta teórica o conceptual. La pregunta debe ser clara, precisa y concisa.`;

    const prompt = [
      "Eres un asistente experto en la creación de preguntas para evaluaciones académicas.",
      "Tu tarea es generar una pregunta COMPLETA en formato Markdown basada en la siguiente solicitud del usuario.",
      "",
      "REGLAS IMPORTANTES:",
      "1. SIEMPRE usa estructura Markdown completa y bien formateada",
      "2. Incluye encabezados (##) para organizar la pregunta",
      "3. Usa listas numeradas o con viñetas cuando sea apropiado",
      "4. Para preguntas de código, incluye bloques de código con el lenguaje especificado",
      "5. La pregunta debe ser clara, precisa y completa",
      "6. No incluyas la solución, solo el enunciado",
      "7. NO incluyas '```markdown' al inicio ni '```' al final de la respuesta",
      "8. NO envuelvas toda la respuesta en bloques de código markdown",
      "9. Genera directamente el contenido markdown sin delimitadores",
      "10. Incluye tablas cuando sea necesario para organizar datos o información",
      "11. La pregunta debe ser COMPACTA y MODERADA en cantidad de texto, pero CLARA",
      "12. Evita texto innecesario o redundante, ve directo al punto",
      "",
      "FORMATO DE LA SOLICITUD:",
      `---`,
      `**Solicitud del usuario:** "${userPrompt}"`,
      `**Tipo de Pregunta:** ${questionType}`,
      `**Lenguaje de programación:** ${language || 'No especificado'}`,
      `---`,
      "",
      typeInstruction,
      "",
      "GENERA LA PREGUNTA COMPLETA EN MARKDOWN:",
      "Asegúrate de incluir:",
      "- Encabezados apropiados (##)",
      "- Formato de texto (negrita, cursiva, etc.)",
      "- Bloques de código si es necesario",
      "- Listas numeradas o con viñetas",
      "- Tablas cuando sea apropiado para organizar datos",
      "- Instrucciones claras para el estudiante",
      "- Texto compacto y directo al punto",
      "",
      "Estructura recomendada:",
      "- Comienza con un encabezado principal (##)",
      "- Incluye secciones como 'Enunciado', 'Requisitos', 'Ejemplo'",
      "- Usa listas para los requisitos",
      "- Incluye bloques de código cuando sea apropiado",
      "- Usa tablas para organizar datos, comparaciones o información estructurada",
      "- Mantén el texto conciso pero completo",
      "",
      "IMPORTANTE: Genera directamente el contenido markdown sin envolverlo en ```markdown```",
      "Ahora genera la pregunta completa:"
    ].join('\\n');

    console.log('📤 Enviando prompt a Gemini...');
    console.log('📋 Prompt completo:', prompt);

    // Generar la respuesta usando la nueva sintaxis de la API
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt
    });
    
    console.log('📥 Respuesta recibida de Gemini:', response);
    
    const generatedText = response.text || '';

    console.log('📄 Texto generado:', generatedText);

    if (!generatedText) {
      console.error('❌ No se recibió texto de la API');
      throw new Error("La API de Gemini no devolvió contenido.");
    }

    console.log('✅ Pregunta generada exitosamente');
    return generatedText.trim();

  } catch (error) {
    console.error("❌ Error al generar la pregunta con la API de Gemini:", error);
    console.error("🔍 Detalles del error:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack available'
    });
    throw new Error("No se pudo generar la pregunta. Por favor, inténtelo de nuevo.");
  }
} 