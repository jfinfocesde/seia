import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { marked } from 'marked';
import hljs from 'highlight.js';

interface DocWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (...args: unknown[]) => void;
}

export function generateQuestionsPdf(questions: { number: number; text: string }[], evaluationTitle: string) {
  const doc = new jsPDF({ unit: 'pt' });
  doc.setFont('helvetica', 'normal');

  const pageWidth = 595.28; // A4 width in pt
  const marginLeft = 32;
  const marginTop = 32;
  const maxWidth = pageWidth - marginLeft * 2;

  // Helper para calcular el alto de un bloque markdown completo
  function getMarkdownHeight(md: string, doc: jsPDF, maxWidth: number) {
    const tokens = marked.lexer(md);
    let y = 0;
    for (const token of tokens) {
      if (token.type === 'heading') {
        const wrapped = doc.splitTextToSize(token.text, maxWidth);
        y += 20 + (wrapped.length - 1) * 16;
      } else if (token.type === 'paragraph') {
        const wrapped = doc.splitTextToSize(token.text, maxWidth);
        y += wrapped.length * 16 + 8;
      } else if (token.type === 'list') {
        for (const item of token.items) {
          const wrapped = doc.splitTextToSize(item.text, maxWidth - 16);
          y += wrapped.length * 16 + 8;
        }
      } else if (token.type === 'code') {
        const lines = token.text.split('\n');
        let total = 0;
        for (const line of lines) {
          const wrapped = doc.splitTextToSize(line, maxWidth - 16);
          total += wrapped.length * 14;
        }
        y += total + 16;
      } else if (token.type === 'blockquote') {
        const wrapped = doc.splitTextToSize(token.text, maxWidth - 8);
        y += wrapped.length * 16 + 8;
      } else if (token.type === 'table') {
        y += (token.rows.length + 1) * 20 + 8;
      } else if (token.type === 'hr') {
        y += 12;
      }
    }
    return y + 32;
  }

  // Renderizar markdown real con wrap estricto
  function renderMarkdownToPdf(md: string, doc: jsPDF, y: number, maxWidth: number) {
    const tokens = marked.lexer(md);
    // Mapeo simple de estilos highlight.js a colores jsPDF
    const styleMap: Record<string, [number, number, number]> = {
      'keyword': [0, 0, 200],
      'built_in': [0, 0, 200],
      'type': [0, 0, 200],
      'literal': [128, 0, 128],
      'number': [255, 140, 0],
      'string': [0, 128, 0],
      'comment': [128, 128, 128],
      'doctag': [128, 128, 128],
      'meta': [128, 0, 0],
      'subst': [0, 0, 0],
      'title': [0, 0, 128],
      'params': [0, 0, 0],
      'function': [0, 0, 128],
      'symbol': [255, 140, 0],
      'class': [0, 0, 128],
      'attr': [0, 128, 128],
      'variable': [0, 128, 128],
      'default': [0, 0, 0],
    };
    for (const token of tokens) {
      if (token.type === 'heading') {
        const size = token.depth === 1 ? 16 : token.depth === 2 ? 14 : 12;
        doc.setFontSize(size);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(token.text, maxWidth);
        doc.text(wrapped, marginLeft, y);
        y += 20 + (wrapped.length - 1) * 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
      } else if (token.type === 'paragraph') {
        let text = token.text;
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/\*(.*?)\*/g, '$1');
        const wrapped = doc.splitTextToSize(text, maxWidth);
        for (const wline of wrapped) {
          doc.text(wline, marginLeft, y);
          y += 16;
        }
        y += 8;
      } else if (token.type === 'list') {
        for (const item of token.items) {
          const prefix = token.ordered ? `${item.index + 1}.` : '•';
          const wrapped = doc.splitTextToSize(item.text, maxWidth - 16);
          doc.text(`${prefix} ${wrapped[0]}`, marginLeft, y);
          y += 16;
          for (let i = 1; i < wrapped.length; i++) {
            doc.text(wrapped[i], marginLeft + 16, y);
            y += 16;
          }
          y += 8;
        }
      } else if (token.type === 'code') {
        // Renderizar bloque de código línea por línea, con fondo y colores
        let highlighted = { value: '', language: '', relevance: 0 };
        if (token.lang && hljs.getLanguage(token.lang)) {
          const result = hljs.highlight(token.text, { language: token.lang });
          highlighted = {
            value: result.value,
            language: result.language ?? '',
            relevance: result.relevance,
          };
        } else {
          const result = hljs.highlightAuto(token.text);
          highlighted = {
            value: result.value,
            language: result.language ?? '',
            relevance: result.relevance,
          };
        }
        const codeLines = token.text.split('\n');
        const blockHeight = codeLines.length * 14 + 16;
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(marginLeft, y, maxWidth, blockHeight, 2, 2, 'F');
        let codeY = y + 8;
        for (const line of codeLines) {
          const html = hljs.highlight(line, { language: highlighted.language || 'plaintext' }).value;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          let x = marginLeft + 8;
          for (const node of tempDiv.childNodes) {
            let text = '';
            let color: [number, number, number] = styleMap['default'];
            if (node.nodeType === 3) {
              text = node.textContent || '';
            } else if (node.nodeType === 1) {
              const span = node as HTMLElement;
              text = span.textContent || '';
              const className = Array.from(span.classList).find(c => c.startsWith('hljs-'));
              let styleKey = 'default';
              if (className) {
                styleKey = className.replace('hljs-', '');
              }
              color = styleMap[styleKey] || styleMap['default'];
            }
            doc.setFont('courier', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...color);
            doc.text(text, x, codeY, { baseline: 'top' });
            x += doc.getTextWidth(text);
          }
          codeY += 14;
        }
        y += blockHeight + 4;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
      } else if (token.type === 'blockquote') {
        doc.setFont('helvetica', 'italic');
        const wrapped = doc.splitTextToSize(token.text, maxWidth - 8);
        for (const wline of wrapped) {
          doc.text(wline, marginLeft + 8, y);
          y += 16;
        }
        y += 8;
        doc.setFont('helvetica', 'normal');
      } else if (token.type === 'table') {
        const tableY = y;
        (doc as DocWithAutoTable).autoTable({
          startY: tableY,
          head: [token.header.map((h: { text: string }) => h.text)],
          body: token.rows.map((row: { text: string }[]) => row.map((cell: { text: string }) => cell.text)),
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: marginLeft },
          tableWidth: maxWidth,
        });
        y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8;
      } else if (token.type === 'hr') {
        doc.setDrawColor(150);
        doc.line(marginLeft, y, marginLeft + maxWidth, y);
        y += 12;
      }
    }
    return y;
  }

  // Renderizar cada pregunta en su propia página de alto ajustado
  questions.forEach((q) => {
    // Calcular alto necesario para el bloque markdown
    const md = q.text;
    const blockHeight = getMarkdownHeight(md, doc, maxWidth);
    const titleHeight = 32 + 24;
    let totalHeight = titleHeight + blockHeight + 32;
    if (totalHeight < pageWidth) totalHeight = pageWidth; // nunca menor que el ancho
    doc.addPage([pageWidth, totalHeight]);
    let y = marginTop;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Preguntas de la evaluación: ${evaluationTitle}`, marginLeft, y);
    y += 24;
    doc.setFontSize(14);
    doc.text(`Pregunta ${q.number}:`, marginLeft, y);
    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    renderMarkdownToPdf(md, doc, y, maxWidth);
  });
  // Eliminar la primera página en blanco (jsPDF agrega una por defecto)
  doc.deletePage(1);
  doc.save(`preguntas_${evaluationTitle.replace(/\s/g, '_')}.pdf`);
} 