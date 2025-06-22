import { useTheme } from 'next-themes';
import type { CSSProperties } from 'react';

export function useMarkdownConfig() {
  const { theme } = useTheme();

  // Devuelve estilos para el visor de Markdown según el tema y el tamaño de la ventana
  const getMarkdownStyles = (): CSSProperties => ({
    padding: window.innerWidth < 640 ? '1rem' : '0.75rem',
    height: '100%',
    width: '100%',
    borderRadius: '0.75rem',
    color: 'var(--foreground)',
    backgroundColor: theme === 'dark' ? 'var(--secondary)' : 'var(--background)',
    overflowY: 'auto', // valor permitido
    fontSize: window.innerWidth < 640 ? '1.1rem' : '1rem',
    lineHeight: '1.6',
    position: 'absolute',
    inset: '0', // como string
  });

  // Para el data-color-mode
  const colorMode = theme === 'dark' ? 'dark' : 'light';

  return { getMarkdownStyles, colorMode };
} 