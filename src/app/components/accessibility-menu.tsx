import { useState } from 'react';
import { Accessibility, X, Plus, Minus, Contrast, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useAccessibility } from '../contexts/accessibility-context';

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { highContrast, fontSize, toggleHighContrast, increaseFontSize, decreaseFontSize, resetFontSize } = useAccessibility();

  return (
    <>
      
      <div className="fixed right-4 bottom-32 z-50 transition-all duration-300">
        {!isOpen ? (
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-transform border-2 border-white/20"
            title="Abrir menu de acessibilidade"
          >
            <Accessibility className="h-7 w-7" />
          </Button>
        ) : (
          <div className="bg-card dark:bg-gray-900 rounded-xl shadow-2xl border border-border dark:border-gray-700 p-5 w-72 mb-4 origin-bottom-right animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground dark:text-gray-100">
                <Accessibility className="h-5 w-5 text-blue-600" />
                Acessibilidade
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-5">
              {/* Alto Contraste */}
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">Alto Contraste</label>
                <Button
                  onClick={toggleHighContrast}
                  variant={highContrast ? 'default' : 'outline'}
                  className="w-full justify-start h-10 font-medium"
                >
                  <Contrast className="h-4 w-4 mr-2" />
                  {highContrast ? 'Modo Contraste Ativado' : 'Ativar Alto Contraste'}
                </Button>
              </div>

              {/* Tamanho da Fonte */}
              <div className="pb-2">
                <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                  Tamanho do Texto <span className="text-blue-600 ml-1">({fontSize}%)</span>
                </label>
                <div className="flex gap-2 bg-muted dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700">
                  <Button
                    onClick={decreaseFontSize}
                    variant="ghost"
                    className="flex-1 hover:bg-card dark:hover:bg-gray-700 shadow-sm"
                    disabled={fontSize <= 80}
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    A-
                  </Button>
                  <Button
                    onClick={resetFontSize}
                    variant="ghost"
                    className="px-3 hover:bg-card dark:hover:bg-gray-700 shadow-sm"
                    title="Tamanho Padrão"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={increaseFontSize}
                    variant="ghost"
                    className="flex-1 hover:bg-card dark:hover:bg-gray-700 shadow-sm"
                    disabled={fontSize >= 150}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    A+
                  </Button>
                </div>
              </div>

              {/* VLibras Info */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-muted-foreground dark:text-gray-400 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                  <svg className="h-4 w-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <span>VLibras ativo. Selecione qualquer texto para tradução.</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}