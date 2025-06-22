import dynamic from 'next/dynamic';
import { useMonacoConfig } from '@/app/student/evaluation/hooks/useMonacoConfig';
import React, { useRef } from 'react';
import type { editor } from 'monaco-editor';

// Carga diferida del editor Monaco
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export const CodeEditor = ({ value, onChange, language, height = '100%' }: CodeEditorProps) => {
  const { getEditorOptions, currentTheme } = useMonacoConfig();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Lenguajes que soportan formateo
  const FORMATTABLE_LANGUAGES = [
    'javascript', 'typescript', 'json', 'css', 'html', 'markdown'
  ];
  const canFormat = FORMATTABLE_LANGUAGES.includes(language);

  // Función para formatear el documento
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden mx-3 sm:mx-4">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(value) => onChange(value || '')}
        options={{
          ...getEditorOptions(window.innerWidth < 640),
          padding: { top: 0, bottom: 0 },
        }}
        theme={currentTheme}
        defaultValue=""
        className="rounded-lg overflow-hidden"
        loading={<div className="flex items-center justify-center h-full w-full bg-black rounded-lg">Cargando editor...</div>}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          editor.onKeyDown((e) => {
            if ((e.ctrlKey || e.metaKey) && (e.keyCode === monaco.KeyCode.KeyC || e.keyCode === monaco.KeyCode.KeyV || e.keyCode === monaco.KeyCode.KeyX)) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          });

          const updateEditorOptions = () => {
            const isMobile = window.innerWidth < 640;
            editor.updateOptions({
              ...getEditorOptions(isMobile),
              padding: { top: 0, bottom: 0 },
            });
          };

          editor.updateOptions({ padding: { top: 0, bottom: 0 } });
          editor.layout();

          window.addEventListener('resize', updateEditorOptions);
          return () => window.removeEventListener('resize', updateEditorOptions);
        }}
      />
      {canFormat && (
        <button
          type="button"
          onClick={handleFormat}
          className="absolute bottom-2 right-3 text-xs text-primary hover:underline bg-transparent border-none p-0 m-0 cursor-pointer"
          style={{ zIndex: 10 }}
        >
          Formatear documento
        </button>
      )}
    </div>
  );
}; 