'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toUTC, isBeforeUTC, isAfterUTC, formatTimeRemaining as formatTime } from '@/lib/date-utils'
import { CodeEditor } from '@/app/student/evaluation/components/code-editor'
import { MarkdownViewer } from '@/app/student/evaluation/components/markdown-viewer'
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages'
import { useTheme } from 'next-themes'

// Función de debounce personalizada para reducir peticiones a la base de datos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, BarChart, CheckCircle, ChevronLeft, ChevronRight, Clock, HelpCircle, Loader2, Send, Sparkles, XCircle, X, PenTool } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FraudReflectionModal } from '@/components/ui/fraud-reflection-modal'
import ThemeToggle from '@/components/theme/ThemeToggle'

// Servicios para evaluar con Gemini AI
import { evaluateStudentCode } from '@/lib/gemini-code-evaluation';
import { evaluateStudentText } from '@/lib/gemini-text-evaluation';

// Tipos para los modelos de datos
type Question = {
  id: number
  text: string
  type: string
  answer?: string | null
  helpUrl?: string | null
}

type Answer = {
  questionId: number
  answer: string
  score?: number | null
  evaluated: boolean
  fraudAttempts?: number
  timeOutsideEval?: number
}

type EvaluationData = {
  id: number
  title: string
  description?: string
  helpUrl?: string
  questions: Question[]
  startTime: Date
  endTime: Date
}

// Los datos de evaluación ahora se cargan desde la base de datos

import { useFraudDetection } from './hooks/useFraudDetection';
import { FraudAlert } from './components/fraud-alert';
import { submitEvaluation } from './actions';
import { useGlobalFraudKeyDetection } from './hooks/useGlobalFraudKeyDetection';

export default function StudentEvaluationPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100"><Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" /><p className="text-xl text-gray-300">Cargando parámetros de la evaluación...</p></div>}>
      <EvaluationContent />
    </Suspense>
  )
}

function EvaluationContent() {
  const { setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const uniqueCode = searchParams.get('code');
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  // Estado para la evaluación y respuestas
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ success: boolean; message: string; details?: string; grade?: number } | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [buttonCooldown, setButtonCooldown] = useState<number>(0);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [isEvaluationExpired, setIsEvaluationExpired] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);

  // Estado local para mensaje de fraude global
  const [globalFraudMessage, setGlobalFraudMessage] = useState<string | null>(null);

  // Usar el hook de detección de fraude
  const {
    fraudAttempts,
    timeOutsideEval,
    isFraudModalOpen,
    currentFraudType,
    currentFraudMessage,
    setIsFraudModalOpen,
    setHelpModalOpen,
    isDevToolsModalOpen,
    setIsDevToolsModalOpen
  } = useFraudDetection({
    submissionId,
    onFraudDetected: async () => {
      if (currentAnswer && submissionId) {
        try {
          const { saveAnswer } = await import('./actions');
          await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            currentAnswer.score ?? undefined,
            fraudAttemptsRef.current + 1,
            timeOutsideEvalRef.current
          );
        } catch (error) {
          console.error('Error al guardar intento de fraude:', error);
        }
      }
    },
    onTimeOutsideUpdated: async (time) => {
      if (currentAnswer && submissionId) {
        try {
          const { saveAnswer } = await import('./actions');
          await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            currentAnswer.score ?? undefined,
            fraudAttemptsRef.current,
            time
          );
        } catch (error) {
          console.error('Error al guardar tiempo fuera de la evaluación:', error);
        }
      }
    }
  });

  // Hook global para detectar fraude por combinaciones de teclas
  useGlobalFraudKeyDetection((reason) => {
    setGlobalFraudMessage(reason);
    setIsFraudModalOpen(true);
  });

  // Actualizar el estado del modal de ayuda
  useEffect(() => {
    setHelpModalOpen(isHelpModalOpen);
  }, [isHelpModalOpen, setHelpModalOpen]);

  // Refs for state values needed in event handlers to avoid dependency loops
  const currentAnswerRef = useRef<Answer | null>(null);
  const fraudAttemptsRef = useRef<number>(0);
  const timeOutsideEvalRef = useRef<number>(0);
  const saveAnswerRef = useRef<((submissionId: number, questionId: number, answerText: string, score?: number, fraudAttempts?: number, timeOutsideEval?: number) => Promise<{ success: boolean; answer?: unknown; error?: string }>) | null>(null);

  // Actualizar las refs cuando cambien los valores
  useEffect(() => {
    currentAnswerRef.current = answers[currentQuestionIndex];
    fraudAttemptsRef.current = fraudAttempts;
    timeOutsideEvalRef.current = timeOutsideEval;
  }, [answers, currentQuestionIndex, fraudAttempts, timeOutsideEval]);

  // Cargar la función saveAnswer una sola vez
  useEffect(() => {
    const loadSaveAnswerFunction = async () => {
      try {
        const { saveAnswer } = await import('./actions');
        saveAnswerRef.current = saveAnswer;
      } catch (error) {
        console.error('Error al cargar la función saveAnswer:', error);
      }
    };

    loadSaveAnswerFunction();
  }, []);

  // Estado para controlar si el componente está montado en el cliente
  const [mounted, setMounted] = useState(false);

  // Asegurarse de que el componente esté montado antes de acceder a localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Restaurar el tema seleccionado al cargar la página
  useEffect(() => {
    // Solo ejecutar en el cliente después de que el componente esté montado
    if (mounted) {
      const savedTheme = localStorage.getItem('selected-theme');
      if (savedTheme) {
        // Si es un tema personalizado, necesitamos manejar el modo oscuro/claro por separado
        if (savedTheme !== 'light' && savedTheme !== 'dark' && savedTheme !== 'system') {
          // Aplicar el tema personalizado
          document.documentElement.classList.add(savedTheme);

          // Mantener el modo oscuro/claro actual
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const isDark = localStorage.getItem('theme') === 'dark' ||
            (localStorage.getItem('theme') === 'system' && prefersDark) ||
            (!localStorage.getItem('theme') && prefersDark);

          // Aplicar el modo oscuro/claro según corresponda
          setTheme(isDark ? 'dark' : 'light');
        } else {
          // Si no es un tema personalizado, simplemente aplicar el tema
          setTheme(savedTheme);
        }
      }
    }
  }, [mounted, setTheme]);

  // Refs for state values needed in event handlers to avoid dependency loops
  const answersRef = useRef(answers);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const isHelpModalOpenRef = useRef(isHelpModalOpen);

  // Calcular el progreso de la evaluación
  const calculateProgress = useCallback(() => {
    if (!answers.length) return 0
    const answeredQuestions = answers.filter(a => a.answer.trim().length > 0).length
    return Math.round((answeredQuestions / answers.length) * 100)
  }, [answers])
  // Effect to keep refs updated with the latest state

  // Effect to keep refs updated with the latest state
  useEffect(() => {
    answersRef.current = answers;
    currentQuestionIndexRef.current = currentQuestionIndex;
    isHelpModalOpenRef.current = isHelpModalOpen;
  }, [answers, currentQuestionIndex, isHelpModalOpen]);

  // Cargar datos de la evaluación
  useEffect(() => {
    if (!uniqueCode || !email || !firstName || !lastName) {
      console.error('Código de evaluación o datos del estudiante incompletos')
      router.push('/student')
      return
    }

    const loadEvaluationData = async () => {
      try {
        // Importar las acciones del servidor de forma dinámica para evitar errores de SSR
        const { getAttemptByUniqueCode, createSubmission } = await import('./actions')

        // Obtener los datos del intento por el código único y el email del estudiante
        const attemptResult = await getAttemptByUniqueCode(uniqueCode, email)

        if (!attemptResult.success) {
          // Verificar si la evaluación ya fue enviada
          if (attemptResult.alreadySubmitted) {
            // Redirigir silenciosamente a la página de éxito sin mostrar error
            router.push(`/student/success?alreadySubmitted=true&code=${uniqueCode}`)
            return
          }

          // Verificar si el error es debido a que la evaluación ha expirado
          if (attemptResult.error === 'La evaluación ya ha finalizado' ||
            attemptResult.error === 'La evaluación aún no ha comenzado') {
            setIsEvaluationExpired(true)
            setLoading(false)
            return
          }

          // Para otros errores, mostrar mensaje de error y establecer estado
          console.error(attemptResult.error)
          setErrorMessage(attemptResult.error || 'Error al cargar la evaluación')
          setLoading(false)
          return
        }

        // Verificar que attempt y evaluationData existan
        const { attempt, evaluation: evaluationData } = attemptResult

        if (!attempt || !evaluationData) {
          console.error('Datos de evaluación incompletos')
          router.push('/student')
          return
        }

        // Verificar si la evaluación está dentro del rango de tiempo permitido
        const now = toUTC(new Date())
        const startTime = toUTC(attempt.startTime)
        const endTime = toUTC(attempt.endTime)

        if (isBeforeUTC(now, startTime) || isAfterUTC(now, endTime)) {
          setIsEvaluationExpired(true)
          setLoading(false)
          return
        }

        // Crear una nueva presentación para este estudiante
        const submissionResult = await createSubmission(attempt.id, email, firstName, lastName)

        if (!submissionResult.success) {
          // Si el error es porque la evaluación ya fue enviada, redirigir a una página específica
          if (submissionResult.error && submissionResult.error.includes('ya fue enviada')) {
            router.push(`/student/success?alreadySubmitted=true&code=${uniqueCode}`)
          } else {
            console.error(submissionResult.error || 'Error al crear la presentación')
            router.push('/student')
          }
          return
        }

        // Verificar que submission exista
        if (!submissionResult.submission) {
          console.error('Error al crear la presentación')
          router.push('/student')
          return
        }

        // Guardar el ID de la presentación para usarlo más tarde
        const submissionId = submissionResult.submission.id
        setSubmissionId(submissionId)

        // Convertir los datos de la evaluación al formato esperado por el componente
        const formattedEvaluation: EvaluationData = {
          id: evaluationData.id,
          title: evaluationData.title,
          description: evaluationData.description || undefined,
          helpUrl: evaluationData.helpUrl || undefined,
          questions: evaluationData.questions,
          startTime: attempt.startTime,
          endTime: attempt.endTime
        }

        setEvaluation(formattedEvaluation)

        // Obtener respuestas guardadas previamente
        const { getAnswersBySubmissionId } = await import('./actions')
        const answersResult = await getAnswersBySubmissionId(submissionId)

        const questions = evaluationData.questions || []
        let initialAnswers = questions.map(question => {
          // Inicializamos todas las respuestas como cadenas vacías por defecto
          return {
            questionId: question.id,
            answer: '',
            evaluated: false,
            score: null as number | null
          }
        })

        // Si hay respuestas guardadas, las cargamos
        if (answersResult.success && answersResult.answers) {
          console.log('Respuestas obtenidas:', answersResult.answers)

          // Actualizar las respuestas con los datos guardados
          initialAnswers = initialAnswers.map(defaultAnswer => {
            // Buscar la respuesta guardada para esta pregunta
            const savedAnswer = answersResult.answers.find(a => a.questionId === defaultAnswer.questionId)

            if (savedAnswer) {
              console.log(`Respuesta encontrada para pregunta ${defaultAnswer.questionId}:`, savedAnswer)

              return {
                ...defaultAnswer,
                answer: savedAnswer.answer || '',
                score: savedAnswer.score,
                evaluated: savedAnswer.score !== null
              }
            }
            return defaultAnswer
          })
        } else {
          console.log('No se encontraron respuestas guardadas o hubo un error:', answersResult)
        }

        setAnswers(initialAnswers)
      } catch (error) {
        console.error('Error al cargar los datos de la evaluación:', error)
        console.error('Error al cargar la evaluación')
        router.push('/student')
      } finally {
        setLoading(false)
      }
    }

    loadEvaluationData()
  }, [uniqueCode, email, firstName, lastName, router])

  // Función para mostrar el diálogo de confirmación de envío
  const openSubmitDialog = useCallback(() => {
    if (!evaluation || !uniqueCode || !email || !firstName || !lastName || !submissionId) return

    setIsSubmitDialogOpen(true)
  }, [evaluation, uniqueCode, email, firstName, lastName, submissionId])

  // Enviar la evaluación completa
  const handleSubmitEvaluation = useCallback(async () => {
    if (!evaluation || !submissionId) return;

    try {
      const result = await submitEvaluation(submissionId);
      if (result.success) {
        setIsResultModalOpen(true);
        setEvaluationResult({
          success: true,
          message: 'Evaluación enviada correctamente',
          grade: typeof result.submission?.score === 'number' ? result.submission.score : undefined
        });
        } else {
        setErrorMessage(result.error || 'Error al enviar la evaluación');
      }
    } catch (error) {
      console.error('Error al enviar la evaluación:', error);
      setErrorMessage('Error al enviar la evaluación');
    }
  }, [evaluation, submissionId]);

  // Referencia para la función de envío de evaluación para evitar dependencias circulares
  const handleSubmitEvaluationRef = useRef(handleSubmitEvaluation);

  // Actualizar la referencia cuando cambie la función
  useEffect(() => {
    handleSubmitEvaluationRef.current = handleSubmitEvaluation;
  }, [handleSubmitEvaluation]);

  // Temporizador para el tiempo restante
  useEffect(() => {
    if (!evaluation) return

    const endTime = toUTC(evaluation.endTime).getTime()
    const updateTimer = () => {
      const now = toUTC(new Date()).getTime()
      const diff = Math.max(0, endTime - now)
      setTimeRemaining(diff)

      if (diff <= 0) {
        // Tiempo agotado, enviar automáticamente
        handleSubmitEvaluationRef.current()
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [evaluation])

  // Formatear el tiempo restante
  const formatTimeRemaining = () => {
    return formatTime(timeRemaining)
  }

  // Función para actualizar contadores en la base de datos (debounced)
  const updateCountersInDB = useCallback(async (questionId: number) => {
    if (!submissionId) return

    try {
      // Usar la referencia a saveAnswer si está disponible
      if (saveAnswerRef.current) {
        await saveAnswerRef.current(
          submissionId,
          questionId,
          '', // No enviamos el texto de la respuesta, solo actualizamos contadores
          undefined, // Sin calificación
          fraudAttempts, // Pasar el contador de intentos de fraude
          timeOutsideEval // Pasar el tiempo acumulado fuera de la evaluación
        )
      } else {
        // Fallback a importación dinámica si la referencia no está disponible
        const { saveAnswer } = await import('./actions')
        await saveAnswer(
          submissionId,
          questionId,
          '', // No enviamos el texto de la respuesta, solo actualizamos contadores
          undefined, // Sin calificación
          fraudAttempts, // Pasar el contador de intentos de fraude
          timeOutsideEval // Pasar el tiempo acumulado fuera de la evaluación
        )
      }
    } catch (error) {
      console.error('Error al actualizar contadores:', error)
      // No mostramos error al usuario para no interrumpir su experiencia
    }
  }, [submissionId, fraudAttempts, timeOutsideEval])

  // Versión con debounce de la función updateCountersInDB
  const debouncedUpdateCounters = useRef(debounce(updateCountersInDB, 1000)) // 1 segundo de debounce

  // Manejar cambios en las respuestas
  const handleAnswerChange = (value: string) => {
    const updatedAnswers = [...answers]
    updatedAnswers[currentQuestionIndex].answer = value
    updatedAnswers[currentQuestionIndex].evaluated = false
    updatedAnswers[currentQuestionIndex].score = null
    setAnswers(updatedAnswers)
    setEvaluationResult(null)

    // Solo actualizar los contadores de fraude y tiempo con debounce
    // La respuesta completa se guardará cuando se evalúe con Gemini
    if (submissionId) {
      debouncedUpdateCounters.current(updatedAnswers[currentQuestionIndex].questionId)
    }
  }

  // Navegar a la pregunta anterior
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(prevIndex)
      setEvaluationResult(null)
    }
  }

  // Navegar a la pregunta siguiente
  const goToNextQuestion = () => {
    if (evaluation && currentQuestionIndex < evaluation.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      setEvaluationResult(null)
    }
  }

  // Navegar a una pregunta específica
  const goToQuestion = (index: number) => {
    if (evaluation && index >= 0 && index < evaluation.questions.length) {
      setCurrentQuestionIndex(index)
      setEvaluationResult(null)
    }
  }

  // Evaluar la respuesta actual con Gemini
  const evaluateCurrentAnswer = async () => {
    if (!evaluation || !submissionId) return

    const currentQuestion = evaluation.questions[currentQuestionIndex]
    const currentAnswer = answers[currentQuestionIndex]

    if (!currentAnswer.answer.trim()) {
      console.warn('Por favor, proporciona una respuesta antes de evaluar')
      return
    }

    // Verificar si el botón está en enfriamiento
    if (buttonCooldown > 0) {
      return
    }

    setEvaluating(true)

    try {
      if (currentQuestion.type === 'CODE') {
        const language = JSON.parse(currentQuestion.answer || '{}').language || 'javascript'

        const result = await evaluateStudentCode(
          currentQuestion.text,
          currentAnswer.answer,
          language
        )

        // Actualizar el estado de la respuesta
        const updatedAnswers = [...answers]
        updatedAnswers[currentQuestionIndex].evaluated = true
        updatedAnswers[currentQuestionIndex].score = result.grade
        setAnswers(updatedAnswers)

        // Guardar la respuesta evaluada en la base de datos
        let saveResult
        if (saveAnswerRef.current) {
          saveResult = await saveAnswerRef.current(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        } else {
          const { saveAnswer } = await import('./actions')
          saveResult = await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        }

        if (!saveResult.success) {
          console.error('Error al guardar la respuesta evaluada:', saveResult.error)
        }

        // Mostrar resultado de la evaluación
        const newResult = {
          success: result.isCorrect,
          message: currentAnswer.evaluated ? 'Respuesta reevaluada' : (result.isCorrect ? '¡Respuesta correcta!' : 'La respuesta necesita mejoras'),
          details: result.feedback,
          grade: result.grade
        }
        setEvaluationResult(newResult)
        setIsResultModalOpen(true)
      } else {
        // Para preguntas de texto, evaluamos con IA usando la función específica para texto
        const result = await evaluateStudentText(
          currentQuestion.text,
          currentAnswer.answer
        )

        // Actualizar el estado de la respuesta
        const updatedAnswers = [...answers]
        updatedAnswers[currentQuestionIndex].evaluated = true
        updatedAnswers[currentQuestionIndex].score = result.grade
        setAnswers(updatedAnswers)

        // Guardar la respuesta evaluada en la base de datos
        let saveResult
        if (saveAnswerRef.current) {
          saveResult = await saveAnswerRef.current(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        } else {
          const { saveAnswer } = await import('./actions')
          saveResult = await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        }

        if (!saveResult.success) {
          console.error('Error al guardar la respuesta evaluada:', saveResult.error)
        }

        const newResult = {
          success: result.isCorrect,
          message: currentAnswer.evaluated ? 'Respuesta reevaluada' : (result.isCorrect ? '¡Respuesta aceptable!' : 'La respuesta necesita mejoras'),
          details: result.feedback,
          grade: result.grade
        }
        setEvaluationResult(newResult)
        setIsResultModalOpen(true)
      }

      // Iniciar el temporizador de enfriamiento (30 segundos)
      setButtonCooldown(30)
      const cooldownTimer = setInterval(() => {
        setButtonCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownTimer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      console.error('Error al evaluar la respuesta:', error)
      console.error('Error al evaluar la respuesta. Por favor, intenta de nuevo.')
    } finally {
      setEvaluating(false)
    }
  }

  // Obtener el color del círculo según el estado de la respuesta
  const getQuestionStatusColor = (index: number) => {
    const answer = answers[index]

    if (!answer || !answer.answer.trim()) {
      return {
        bgColor: 'bg-muted border border-muted-foreground/30',
        tooltip: 'Sin responder',
        score: null
      }
    }

    if (!answer.evaluated) {
      return {
        bgColor: 'bg-amber-400 dark:bg-amber-600 border border-amber-500/50 dark:border-amber-700/50 animate-pulse',
        tooltip: 'Respondida pero no evaluada',
        score: null
      }
    }

    // Usar los mismos rangos y colores que en las alertas de respuestas
    if (answer.score !== null && answer.score !== undefined) {
      if (answer.score >= 4 && answer.score <= 5) {
        return {
          bgColor: 'bg-emerald-500 dark:bg-emerald-600 border border-emerald-600/50 dark:border-emerald-700/50',
          tooltip: 'Correcta',
          score: answer.score
        }
      } else if (answer.score >= 3 && answer.score < 4) {
        return {
          bgColor: 'bg-amber-500 dark:bg-amber-600 border border-amber-600/50 dark:border-amber-700/50',
          tooltip: 'Aceptable',
          score: answer.score
        }
      } else {
        return {
          bgColor: 'bg-red-500 dark:bg-red-600 border border-red-600/50 dark:border-red-700/50',
          tooltip: 'Necesita mejoras',
          score: answer.score
        }
      }
    }

    return {
      bgColor: 'bg-rose-500 dark:bg-rose-600 border border-rose-600/50 dark:border-rose-700/50',
      tooltip: 'Necesita mejoras',
      score: null
    }
  }

  // Renderizar pantalla de evaluación expirada
  const renderExpiredEvaluation = () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-red-600 dark:text-red-500">
              Evaluación no disponible
            </CardTitle>
            <CardDescription className="text-center">
              Esta evaluación ya no está disponible porque la fecha y hora límite ha expirado o aún no ha comenzado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Clock className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-center mb-6">
              Por favor, contacta con tu profesor si necesitas acceso a esta evaluación.
            </p>
            <Button
              onClick={() => router.push('/student')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Volver a ingresar código
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Función para cerrar el modal de ayuda
  const handleCloseHelpModal = useCallback((open: boolean) => {
    setIsHelpModalOpen(open);
    setHelpModalOpen(open);
  }, [setHelpModalOpen]);

  // Efecto para cerrar el Sheet cuando el usuario cambia de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isHelpModalOpen) {
        handleCloseHelpModal(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHelpModalOpen, handleCloseHelpModal]);

  // Efecto para detectar cuando la página está oculta
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Efecto para detectar cuando la página está oculta y actualizar el título
  useEffect(() => {
    let titleInterval: NodeJS.Timeout;
    const originalTitle = evaluation?.title || 'Evaluación';

    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
      
      if (document.hidden) {
        // Cuando la página está oculta, alternar el título más rápidamente
        let showWarning = true;
        titleInterval = setInterval(() => {
          document.title = showWarning ? '🚨 ¡ALERTA! ¡Vuelve a la evaluación!' : '⚠️ ¡No abandones la evaluación!';
          showWarning = !showWarning;
        }, 800); // Reducido a 800ms para un parpadeo más rápido
      } else {
        // Cuando la página está visible, restaurar el título original
        clearInterval(titleInterval);
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(titleInterval);
      document.title = originalTitle;
    };
  }, [evaluation?.title]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Cargando evaluación...</p>
        </div>
      </div>
    )
  }

  if (isEvaluationExpired) {
    return renderExpiredEvaluation();
  }

  // Mostrar mensaje de error si hay un problema con la evaluación
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-red-600 dark:text-red-500">
              Prueba no disponible
            </CardTitle>
            <CardDescription className="text-center">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-center mb-6">
              Por favor, verifica el código de evaluación o contacta con tu profesor si necesitas acceso a esta evaluación.
            </p>
            <Button
              onClick={() => router.push('/student')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Volver a ingresar código
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">No se pudo cargar la evaluación. Por favor, verifica el código e intenta de nuevo.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/student')}>Volver</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const currentQuestion = evaluation.questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestionIndex]

  // Determinar el lenguaje de programación para preguntas de código
  let language = 'javascript'
  if (currentQuestion && currentQuestion.type === 'CODE' && currentQuestion.answer) {
    try {
      const answerData = JSON.parse(currentQuestion.answer)
      language = answerData.language || 'javascript'
    } catch (e) {
      console.error('Error al parsear el campo answer:', e)
    }
  }

  // Función para abrir el modal de ayuda
  const handleOpenHelpModal = () => {
    if (!evaluation?.helpUrl) return;
      setIsHelpModalOpen(true);
    setHelpModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-auto">
      {/* Barra superior con información y controles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-card shadow-md flex-shrink-0 border-b gap-2">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="overflow-hidden">
            <h1 className={`text-lg md:text-xl font-bold truncate transition-all duration-300 ${isPageHidden ? 'animate-pulse text-red-500 dark:text-red-400' : ''}`}>
              {isPageHidden ? '⚠️ ' : ''}{evaluation.title}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{firstName} {lastName}</p>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          {/* Contenedor principal para elementos informativos con altura uniforme */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
            {/* Nota calculada */}
            {answers.some(a => a.evaluated) && (
              <div className="flex items-center gap-1 h-9 bg-primary/10 px-3 rounded-md flex-grow md:flex-grow-0">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  Nota: {(answers.reduce((sum, a) => sum + (a.score || 0), 0) / evaluation.questions.length).toFixed(1)}/5.0
                </span>
              </div>
            )}

            {/* Indicador de progreso */}
            <div className="flex items-center gap-1 h-9 bg-primary/10 px-3 rounded-md flex-grow md:flex-grow-0">
              <BarChart className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">Progreso</span>
                  <span className="text-xs font-semibold">{calculateProgress()}%</span>
                </div>
                <div className="w-full md:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Temporizador - Con la misma altura que los otros elementos */}
            <div className="flex items-center h-9 gap-1 bg-primary/10 px-3 rounded-md flex-grow md:flex-grow-0">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">Tiempo</span>
                  <span className="text-xs font-semibold">{formatTimeRemaining()}</span>
                </div>
                <div className="w-full md:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${timeRemaining ? (timeRemaining / (new Date(evaluation.endTime).getTime() - new Date(evaluation.startTime).getTime())) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Alerta de intentos de fraude y tiempo fuera */}
            {(fraudAttempts > 0 || timeOutsideEval > 0) && (
              <FraudAlert
                fraudAttempts={fraudAttempts}
                timeOutsideEval={timeOutsideEval}
              />
            )}
          </div>

          {/* Separador vertical en escritorio, horizontal en móvil */}
          <div className="hidden md:block h-9 border-l mx-1"></div>
          <div className="block md:hidden w-full border-t my-1"></div>

          {/* Contenedor para botones con altura uniforme */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Botón de ayuda para la evaluación general */}
            <Button
              size="sm"
              variant="default"
              onClick={handleOpenHelpModal}
              className="gap-1 h-9 flex-grow md:flex-grow-0"
              title="Ver recursos de ayuda"
              disabled={!evaluation?.helpUrl}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="inline sm:hidden md:hidden lg:inline">Ayuda</span>
              <span className="hidden sm:inline md:inline lg:hidden">Ayuda</span>
            </Button>

            {/* Botón de ayuda para la pregunta específica */}
            {currentQuestion.helpUrl ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsHelpModalOpen(true)}
                className="gap-1 h-9 flex-grow md:flex-grow-0"
                title="Ver recursos de ayuda para esta pregunta"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="inline sm:hidden md:hidden lg:inline">Ayuda P.</span>
                <span className="hidden sm:inline md:hidden lg:hidden">Ayuda Pregunta</span>
                <span className="hidden md:inline lg:hidden">Ayuda P.</span>
              </Button>
            ) : null}

            {/* Botón de enviar evaluación */}
            <Button
              size="sm"
              onClick={openSubmitDialog}
              disabled={loading}
              className="gap-1 h-9 flex-grow md:flex-grow-0"
            >
              <Send className="h-4 w-4" />
              <span className="inline sm:hidden md:hidden lg:inline">{loading ? 'Enviando...' : 'Enviar'}</span>
              <span className="hidden sm:inline md:inline lg:hidden">{loading ? '...' : 'Enviar'}</span>
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><ThemeToggle className="flex-shrink-0" /></span>
                </TooltipTrigger>
                <TooltipContent>Cambiar tema</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* El resultado de la evaluación ahora se muestra en un modal */}

      {/* Contenido principal - Diseño tipo landing page en móviles */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 p-3 sm:p-4 flex-grow" style={{ minHeight: 'auto' }}>
        {/* Columna izquierda: Visualizador de Markdown */}
        <Card className="flex flex-col overflow-hidden mb-2 lg:mb-0">
          <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0 mb-1 sm:mb-2">
            <CardTitle className="flex justify-between items-center text-sm sm:text-base">
              <span>Pregunta {currentQuestionIndex + 1}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${currentQuestion.type === 'CODE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                {currentQuestion.type === 'CODE' ? 'Código' : 'Texto'}
              </span>
            </CardTitle>
          </CardHeader>          <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
            <MarkdownViewer content={currentQuestion.text} />
          </CardContent>
        </Card>

        {/* Columna derecha: Editor de respuesta */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0">
            <CardTitle className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm sm:text-base gap-1 sm:gap-0">
              <span>Tu Respuesta</span>
              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                {currentQuestion.type === 'CODE' && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 truncate max-w-[100px] sm:max-w-none">
                    {LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label || language}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={evaluateCurrentAnswer}
                  disabled={evaluating || !currentAnswer.answer.trim()}
                  className="h-10 sm:h-8 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-md hover:shadow-lg px-4"
                >
                  {evaluating ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span className="hidden xs:inline">Evaluando...</span>
                      <span className="xs:hidden">...</span>
                    </span>
                  ) : buttonCooldown > 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden xs:inline">{currentAnswer.evaluated ? "Reevaluar" : "Evaluar"} ({buttonCooldown}s)</span>
                      <span className="xs:hidden">({buttonCooldown}s)</span>
                    </span>
                  ) : currentAnswer.evaluated ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden xs:inline">Reevaluar con IA</span>
                      <span className="xs:hidden">Reevaluar</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden xs:inline">Evaluar con IA</span>
                      <span className="xs:hidden">Evaluar</span>
                    </span>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>          <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
            {currentQuestion.type === 'CODE' ? (
              <CodeEditor
                  value={currentAnswer.answer}
                onChange={handleAnswerChange}
                language={language}
              />
            ) : (
              <div className="absolute inset-0 m-3 sm:m-4">
                <Textarea
                  placeholder="Escribe tu respuesta aquí..."
                  value={currentAnswer.answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full h-full resize-none rounded-lg"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    fontSize: window.innerWidth < 640 ? '1.2rem' : '1.2rem',
                    padding: window.innerWidth < 640 ? '16px' : '12px',
                    lineHeight: '1.6',
                    overflowY: 'auto'
                  }}
                  spellCheck={true}
                  onKeyDown={(e) => {
                    // Prevenir Ctrl+C, Ctrl+V, Ctrl+X
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer con controles de paginación - Mejorado para móviles */}
      <div className="flex justify-center items-center p-3 sm:p-4 bg-card shadow-md border-t border-border flex-shrink-0 sticky bottom-0 z-10">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Botones de navegación y paginación en modo móvil */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 h-10 px-3"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden xs:inline font-medium">Anterior</span>
            </Button>

            {/* Paginación con tooltips */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 px-1 max-w-[calc(100vw-180px)] sm:max-w-none">
              {evaluation.questions.map((_, index) => {
                const statusStyle = getQuestionStatusColor(index);
                return (
                  <TooltipProvider key={index}>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => goToQuestion(index)}
                          className={`relative flex-shrink-0 flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full ${statusStyle.bgColor} shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-200 ease-in-out`}
                          aria-label={`Pregunta ${index + 1}: ${statusStyle.tooltip}`}
                        >
                          {/* Círculo interno (número de pregunta) */}
                          <div className={`absolute inset-1 flex items-center justify-center rounded-full ${currentQuestionIndex === index ? 'bg-primary text-primary-foreground font-medium' : 'bg-secondary text-secondary-foreground'} transition-colors duration-200 ease-in-out`}>
                            <span className="text-xs font-semibold">{index + 1}</span>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs font-medium">
                        <p>{statusStyle.tooltip}</p>
                        {statusStyle.score !== null && (
                          <p className="font-semibold mt-1">Nota: {statusStyle.score.toFixed(1)}/5.0</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === evaluation.questions.length - 1}
              className="flex items-center gap-1 h-10 px-3"
            >
              <span className="hidden xs:inline font-medium">Siguiente</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet de ayuda con iframe a pantalla completa */}
      {evaluation && (
        <Sheet open={isHelpModalOpen} onOpenChange={handleCloseHelpModal}>
          <SheetContent side="right" className="w-full sm:max-w-full p-0 h-[100dvh] rounded-none mt-0">
            <SheetHeader className="p-2 border-b">
              <div className="flex items-center gap-2 relative">
                <PenTool className="h-6 w-6 text-primary" />
                <span className="font-bold text-base">SEIA</span>
                <SheetTitle className="text-base ml-4">Recursos de ayuda</SheetTitle>
                <SheetClose
                  className="h-7 px-1.5 py-0.5 text-xs border-none shadow-none bg-transparent opacity-80 hover:opacity-100 focus:outline-none flex items-center gap-1 ml-auto"
                  style={{ minWidth: 0 }}
                >
                  <X className="h-4 w-4" />                  
                </SheetClose>
              </div>
            </SheetHeader>
            <div className="flex-1 h-[calc(100dvh-3.5rem)]">
              <iframe
                src={currentQuestion.helpUrl || evaluation.helpUrl || ''}
                className="w-full h-full border-0"
          title="Recursos de ayuda"
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Modal de confirmación para enviar evaluación */}
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío de evaluación</AlertDialogTitle>
            <AlertDialogDescription>
              {answers.filter(a => !a.answer.trim()).length > 0 ? (
                <>
                  <p className="mb-2">Tienes <span className="font-bold text-destructive">{answers.filter(a => !a.answer.trim()).length} pregunta(s) sin responder</span>.</p>
                  <p>Una vez enviada la evaluación, no podrás modificar tus respuestas. ¿Estás seguro de que deseas enviar la evaluación?</p>
                </>
              ) : (
                <p>Una vez enviada la evaluación, no podrás modificar tus respuestas. ¿Estás seguro de que deseas enviar la evaluación?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitEvaluation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar evaluación'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para mostrar el resultado de la evaluación */}
      {evaluationResult && (
        <AlertDialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl flex items-center gap-2">
                {evaluationResult.grade !== undefined ? (
                  evaluationResult.grade >= 4 ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : evaluationResult.grade >= 3 ? (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )
                ) : (
                  evaluationResult.success ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  )
                )}
                <span>
                  Resultado de la evaluación
                  {evaluationResult.grade !== undefined && (
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${evaluationResult.grade >= 4 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                      evaluationResult.grade >= 3 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                        'bg-red-500/20 text-red-700 dark:text-red-300'
                      }`}>
                      {evaluationResult.grade.toFixed(1)}/5.0
                    </span>
                  )}
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xl font-medium mt-2">
                {evaluationResult.message}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {evaluationResult.details && (
              <div className="my-4 max-h-[60vh] overflow-y-auto p-5 bg-muted/50 rounded-lg border">
                <p className="text-lg whitespace-pre-wrap leading-relaxed">{evaluationResult.details}</p>
              </div>
            )}

            <AlertDialogFooter className="gap-2">
              <AlertDialogAction onClick={() => setIsResultModalOpen(false)} className="w-full sm:w-auto">
                Cerrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Modal de reflexión sobre fraude */}
      <FraudReflectionModal
        isOpen={isFraudModalOpen}
        onClose={() => setIsFraudModalOpen(false)}
        fraudType={globalFraudMessage ? 'teclas-extensiones' : currentFraudType}
        fraudCount={fraudAttempts}
        fraudMessage={globalFraudMessage || currentFraudMessage}
      />

      <AlertDialog open={isDevToolsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Herramientas de desarrollo detectadas</AlertDialogTitle>
            <AlertDialogDescription>
              No está permitido abrir las herramientas de desarrollo durante la evaluación. Por favor, ciérralas para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsDevToolsModalOpen(false)}>
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
