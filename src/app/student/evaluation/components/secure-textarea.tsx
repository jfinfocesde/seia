import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useSecurityMeasures } from '../hooks/useSecurityMeasures';

interface SecureTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SecureTextarea: React.FC<SecureTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className,
  style
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Aplicar medidas de seguridad
  useSecurityMeasures(textareaRef, 'textarea');

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        resize: 'none',
        overflowY: 'auto'
      }}
      onKeyDown={(e) => {
        // Prevenir Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
          e.preventDefault();
        }
      }}
    />
  );
}; 