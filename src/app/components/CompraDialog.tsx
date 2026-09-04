import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Wallet, CalendarClock } from 'lucide-react';

interface Props {
  aberto: boolean;
  totalCompra: number;
  onCancelar: () => void;
  onConfirmar: (info: { pagamentoImediato: boolean; dataVencimento?: string }) => void;
}

// Modal de fechamento de uma Entrada (compra de mercadoria) no scanner:
// escolhe se o pagamento foi à vista (baixa o Caixa agora) ou a prazo (vira
// Despesa/Contas a Pagar, com vencimento).
export function CompraDialog({ aberto, totalCompra, onCancelar, onConfirmar }: Props) {
  const [pagamentoImediato, setPagamentoImediato] = useState<boolean | null>(null);
  const hoje = new Date();
  const padraoVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30)
    .toISOString()
    .slice(0, 10);
  const [dataVencimento, setDataVencimento] = useState(padraoVencimento);

  const fechar = () => {
    setPagamentoImediato(null);
    setDataVencimento(padraoVencimento);
    onCancelar();
  };

  const confirmar = () => {
    if (pagamentoImediato === null) return;
    onConfirmar({
      pagamentoImediato,
      dataVencimento: pagamentoImediato ? undefined : dataVencimento,
    });
    setPagamentoImediato(null);
    setDataVencimento(padraoVencimento);
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrada de Mercadoria — Total: R$ {totalCompra.toFixed(2)}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Como essa compra vai ser paga? Isso define se o valor sai do Caixa agora ou vira uma conta a pagar.
        </p>

        <div className="grid grid-cols-2 gap-2 py-2">
          <button
            type="button"
            onClick={() => setPagamentoImediato(true)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
              ${pagamentoImediato === true
                ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'border-border text-foreground hover:bg-muted'}`}
          >
            <Wallet className="h-5 w-5" />
            À vista (baixa o Caixa agora)
          </button>

          <button
            type="button"
            onClick={() => setPagamentoImediato(false)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
              ${pagamentoImediato === false
                ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'border-border text-foreground hover:bg-muted'}`}
          >
            <CalendarClock className="h-5 w-5" />
            A prazo (Contas a Pagar)
          </button>
        </div>

        {pagamentoImediato === false && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium text-foreground">Vencimento</label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={confirmar} disabled={pagamentoImediato === null}>
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
