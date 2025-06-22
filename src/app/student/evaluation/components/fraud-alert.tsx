import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FraudAlertProps {
  fraudAttempts: number;
  timeOutsideEval: number;
}

export function FraudAlert({ fraudAttempts, timeOutsideEval }: FraudAlertProps) {
  if (fraudAttempts === 0 && timeOutsideEval === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center h-auto py-1.5 gap-2 bg-gradient-to-r from-orange-600 to-red-600 px-3 rounded-lg flex-grow md:flex-grow-0 shadow-lg border border-red-400/30 cursor-help">
            <div className="bg-white/20 p-1 rounded-full">
              {/* Eliminar <AlertTriangle ... /> */}
            </div>
            <div className="flex flex-row gap-3 items-center">
              {fraudAttempts > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <div className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{fraudAttempts}</span>
                      </div>
                      <span className="text-white text-xs font-medium">fraudes</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px] bg-slate-900 text-white">
                    <div className="space-y-2">
                      <p className="font-bold">Incidentes de seguridad detectados:</p>
                      <ul className="list-disc pl-4 text-xs space-y-1">
                        <li>Navegación fuera de la ventana de evaluación</li>
                        <li>Cambio de pestaña o aplicación</li>
                        <li>Uso de atajos de teclado restringidos</li>
                        <li>Intento de manipulación del contenido</li>
                        <li>Intento de captura o impresión</li>
                        <li>Uso de funciones del navegador bloqueadas</li>
                        <li>Intento de compartir o exportar contenido</li>
                        <li>Modificación del tamaño de la ventana</li>
                      </ul>
                      <p className="text-xs text-orange-300 mt-2">Nota: Cada incidente queda registrado y puede afectar la validez de tu evaluación.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              {fraudAttempts > 0 && timeOutsideEval > 0 && (
                <div className="h-4 w-px bg-white/30"></div>
              )}

              {timeOutsideEval > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <div className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{Math.floor(timeOutsideEval / 60)}</span>
                      </div>
                      <span className="text-white text-xs font-medium">min</span>
                      <div className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{timeOutsideEval % 60}</span>
                      </div>
                      <span className="text-white text-xs font-medium">seg</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px] bg-slate-900 text-white">
                    <p>Tiempo total fuera de la evaluación</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] bg-slate-900 text-white">
          <div className="space-y-2">
            <p className="font-bold">Sistema de Seguridad SEIAC</p>
            <p className="text-xs">El sistema ha detectado comportamientos que podrían comprometer la integridad de la evaluación. Por favor, mantén el foco en la ventana de evaluación y evita acciones que puedan ser interpretadas como intentos de fraude.</p>
            <p className="text-xs text-orange-300 mt-2">Recuerda: La honestidad académica es fundamental para tu desarrollo profesional.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 