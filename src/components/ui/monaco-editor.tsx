'use client';
import dynamic from 'next/dynamic';
import { loader } from '@monaco-editor/react';

// Indicar a Monaco dónde encontrar sus 'workers'
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: '/_next/static/npm/monaco-editor@0.43.0/min/vs',
    },
  });
}

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

export { MonacoEditor };
