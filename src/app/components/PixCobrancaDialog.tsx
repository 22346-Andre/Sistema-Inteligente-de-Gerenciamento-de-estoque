import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface PixCobrancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valor: number;
  carregando: boolean;
  copiaECola: string | null;
  erro: string | null;
}


export function PixCobrancaDialog({ open, onOpenChange, valor, carregando, copiaECola, erro }: PixCobrancaDialogProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!copiaECola) return;
    try {
      await navigator.clipboard.writeText(copiaECola);
      setCopiado(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95%] mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Cobrança PIX</DialogTitle>
          <DialogDescription>
            Valor: <span className="font-bold text-foreground">R$ {valor.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Gerando cobrança...
            </div>
          ) : erro ? (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {erro}
            </div>
          ) : copiaECola ? (
            <>
              
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-lg border border-border">
                  <QRCodeSVG value={copiaECola} size={200} level="M" marginSize={0} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-2 text-center">
                Escaneie com a câmera do banco, ou copie o código "Pix Copia e Cola" abaixo:
              </p>
              <textarea
                readOnly
                value={copiaECola}
                className="w-full h-24 text-xs font-mono p-2 rounded-md border border-input bg-muted resize-none"
                onFocus={(e) => e.target.select()}
              />
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {copiaECola && (
            <Button onClick={copiar} className="gap-2">
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiado!' : 'Copiar código'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
