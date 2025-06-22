import dynamic from 'next/dynamic';
import { useMarkdownConfig } from '../hooks/useMarkdownConfig';
import { useRef } from 'react';
import { useSecurityMeasures } from '../hooks/useSecurityMeasures';

// Carga diferida del visor de Markdown
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  const { getMarkdownStyles, colorMode } = useMarkdownConfig();
  const viewerRef = useRef<HTMLDivElement>(null);

  // Aplicar medidas de seguridad
  useSecurityMeasures(viewerRef, 'markdown');

  return (
    <div 
      ref={viewerRef}
      data-color-mode={colorMode} 
      className="absolute inset-0 rounded-lg overflow-y-auto mx-3 sm:mx-4"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <MDPreview
        source={content}
        style={{
          ...getMarkdownStyles(),
          overflowY: 'auto',
          height: '100%',
          padding: '1rem'          
        }}
        disableCopy={true}
      />
      {/* Capa transparente para prevenir interacciones */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}; 