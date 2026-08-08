import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { HelpCircle } from 'lucide-react';

interface Props {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  label?: string;
  variant?: 'outline' | 'ghost';
}

/**
 * Botão pequeno que abre um modal com instruções/explicações. Usado pra
 * tirar blocos de texto explicativo da tela principal (que só poluem a
 * interface no dia a dia) sem esconder a informação de quem precisa dela —
 * ela continua a um clique de distância.
 */
export function InstrucoesButton({ titulo, descricao, children, label = 'Instruções', variant = 'outline' }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setAberto(true)} className="gap-2 shrink-0">
        <HelpCircle className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl w-[95%] mx-auto rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descricao && <DialogDescription>{descricao}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 text-sm">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
