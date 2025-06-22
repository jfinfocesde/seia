import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string;
      };
    };
    browser?: {
      runtime?: {
        id?: string;
      };
    };
    safari?: {
      extension?: {
        baseURI?: string;
      };
    };
  }
}

export const useSecurityMeasures = (
  elementRef: React.RefObject<HTMLElement | editor.IStandaloneCodeEditor | null>,
  type: 'monaco' | 'textarea' | 'markdown'
) => {
  const securityInterval = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    // Función para detectar y prevenir manipulaciones maliciosas
    const checkForMaliciousActivity = () => {
      // Verificar si hay extensiones de navegador activas
      const hasExtensions = window.chrome?.runtime?.id || 
                          window.browser?.runtime?.id || 
                          window.safari?.extension?.baseURI;

      if (hasExtensions) {
        const event = new CustomEvent('fraud-detected', {
          detail: { type: 'browser-extension' }
        });
        window.dispatchEvent(event);
      }

      // Verificar si las devtools están abiertas
      const devtoolsOpen = window.outerHeight - window.innerHeight > 200;
      if (devtoolsOpen) {
        const event = new CustomEvent('fraud-detected', {
          detail: { type: 'devtools-open' }
        });
        window.dispatchEvent(event);
      }

      // Verificar si el DOM ha sido manipulado
      if (type === 'monaco' && 'getModel' in element) {
        const editor = element as editor.IStandaloneCodeEditor;
        const model = editor.getModel();
        if (model) {
          const currentValue = model.getValue();
          if (currentValue !== lastContentRef.current) {
            // Si el contenido ha sido modificado externamente, restaurar el último valor conocido
            model.setValue(lastContentRef.current);
            
            const event = new CustomEvent('fraud-detected', {
              detail: { type: 'content-manipulation' }
            });
            window.dispatchEvent(event);
          }
        }
      }
    };

    // Configurar protección según el tipo de elemento
    const setupSecurity = () => {
      if (type === 'monaco' && 'onKeyDown' in element) {
        const editor = element as editor.IStandaloneCodeEditor;
        
        // Bloquear atajos de teclado
        editor.onKeyDown((e) => {
          // Prevenir Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
          if ((e.ctrlKey || e.metaKey) && 
              (e.keyCode === 67 || // C
               e.keyCode === 86 || // V
               e.keyCode === 88 || // X
               e.keyCode === 65)) { // A
            e.preventDefault();
            return false;
          }

          // Prevenir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
          if (e.keyCode === 123 || // F12
              ((e.ctrlKey || e.metaKey) && e.shiftKey && 
               (e.keyCode === 73 || // I
                e.keyCode === 74 || // J
                e.keyCode === 67))) { // C
            e.preventDefault();
            return false;
          }
        });

        // Bloquear menú contextual
        editor.onContextMenu(() => {
          return false;
        });

        // Bloquear selección de texto
        editor.onDidChangeCursorSelection((e) => {
          if (e.selection.startLineNumber !== e.selection.endLineNumber) {
            editor.setSelection({
              startLineNumber: e.selection.startLineNumber,
              startColumn: 1,
              endLineNumber: e.selection.startLineNumber,
              endColumn: 1
            });
          }
        });

        // Monitorear cambios en el contenido
        editor.onDidChangeModelContent(() => {
          const model = editor.getModel();
          if (model) {
            lastContentRef.current = model.getValue();
          }
        });

        // Configuración adicional de seguridad para Monaco
        editor.updateOptions({
          readOnly: false,
          contextmenu: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          domReadOnly: false,
          accessibilitySupport: 'off',
          folding: false,
          lineNumbers: 'on',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          }
        });

      } else if (type === 'textarea' || type === 'markdown') {
        const htmlElement = element as HTMLElement;

        // Bloquear selección de texto
        htmlElement.style.userSelect = 'none';
        htmlElement.style.webkitUserSelect = 'none';

        // Bloquear menú contextual
        htmlElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          return false;
        });

        // Bloquear atajos de teclado
        htmlElement.addEventListener('keydown', (e) => {
          // Prevenir Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
          if ((e.ctrlKey || e.metaKey) && 
              ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            return false;
          }

          // Prevenir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
          if (e.key === 'F12' || 
              ((e.ctrlKey || e.metaKey) && e.shiftKey && 
               ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
            e.preventDefault();
            return false;
          }
        });

        // Bloquear selección de texto
        htmlElement.addEventListener('selectstart', (e) => {
          e.preventDefault();
          return false;
        });

        // Para markdown, permitir scroll pero mantener la seguridad
        if (type === 'markdown') {
          // Mantener el scroll vertical
          htmlElement.style.overflowY = 'auto';
          
          // Agregar un div transparente que cubra todo el contenido
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.inset = '0';
          overlay.style.zIndex = '10';
          overlay.style.pointerEvents = 'none';
          htmlElement.appendChild(overlay);
        }
      }
    };

    setupSecurity();

    // Verificar periódicamente por actividad maliciosa
    securityInterval.current = setInterval(checkForMaliciousActivity, 1000);

    // Limpiar al desmontar
    return () => {
      if (securityInterval.current) {
        clearInterval(securityInterval.current);
      }
    };
  }, [elementRef, type]);
}; 