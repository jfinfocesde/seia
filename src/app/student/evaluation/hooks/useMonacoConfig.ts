import { useTheme } from 'next-themes';
import { useMonaco } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import Monokai from 'monaco-themes/themes/Monokai.json';
import type { editor } from 'monaco-editor';

// Nombres de los temas
const monokaiThemeName = "monokai-custom";
const lightThemeName = "github-light-custom";

export const useMonacoConfig = () => {
  const { theme } = useTheme();
  const monaco = useMonaco();
  const themeInitializedRef = useRef(false);
  const previousThemeRef = useRef(theme);

  useEffect(() => {
    if (monaco && !themeInitializedRef.current) {
      // Definir tema oscuro (Monokai)
      monaco.editor.defineTheme(monokaiThemeName, {
        ...Monokai,
        base: Monokai.base as "vs-dark"
      });

      // Definir tema claro
      monaco.editor.defineTheme(lightThemeName, {
        base: "vs" as const,
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000' },
          { token: 'string', foreground: 'A31515' },
          { token: 'keyword', foreground: '0000FF' },
          { token: 'number', foreground: '098658' },
          { token: 'operator', foreground: '000000' },
          { token: 'function', foreground: '795E26' },
          { token: 'variable', foreground: '001080' },
          { token: 'type', foreground: '267F99' },
          { token: 'class', foreground: '267F99' },
          { token: 'interface', foreground: '267F99' },
        ],
        colors: {
          'editor.background': '#FFFFFF',
          'editor.foreground': '#252525',
          'editor.lineHighlightBackground': '#eeeeee',
          'editor.selectionBackground': '#add6ff',
          'editor.selectionHighlightBackground': '#add6ff',
          'editorCursor.foreground': '#000000',
          'editorWhitespace.foreground': '#bbbbbb',
          'editorIndentGuide.activeBackground': '#d3d3d3',
          'editor.selectionHighlightBorder': '#dddddd'
        }
      });

      themeInitializedRef.current = true;
    }

    // Aplicar el tema solo cuando cambie el tema actual
    if (monaco && themeInitializedRef.current && previousThemeRef.current !== theme) {
      monaco.editor.setTheme(theme === 'dark' ? monokaiThemeName : lightThemeName);
      previousThemeRef.current = theme;
    }
  }, [monaco, theme]);

  const getEditorOptions = (isMobile: boolean): editor.IStandaloneEditorConstructionOptions => ({
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: isMobile ? 14 : 16,
    wordWrap: 'on',
    mouseWheelZoom: true,
    roundedSelection: true,
    readOnly: false,
    contextmenu: false,
    lineNumbers: isMobile ? 'off' : 'on' as const,
    folding: !isMobile,
    padding: { top: 12, bottom: 12 },
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      verticalScrollbarSize: isMobile ? 12 : 8,
      horizontalScrollbarSize: isMobile ? 12 : 8,
      alwaysConsumeMouseWheel: false
    },
    fixedOverflowWidgets: true,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 2,
    quickSuggestions: !isMobile,
    parameterHints: { enabled: !isMobile },
    cursorSurroundingLines: isMobile ? 3 : 0,
    cursorWidth: isMobile ? 2 : 1,
    stickyScroll: {
      enabled: false, // Deshabilita Sticky Scroll
    },
  });

  return {
    getEditorOptions,
    currentTheme: theme === 'dark' ? monokaiThemeName : lightThemeName
  };
}; 