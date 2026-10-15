/// <reference types="vite/client" />

// src/global.d.ts
import 'react';

declare module 'react' {
  // Ensina ao TypeScript que QUALQUER elemento HTML agora aceita os atributos do VLibras
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    vw?: string | boolean;
    'vw-access-button'?: string | boolean;
    'vw-plugin-wrapper'?: string | boolean;
  }
}