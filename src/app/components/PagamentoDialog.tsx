import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CreditCard, QrCode, Banknote, HandCoins } from 'lucide-react';
import type { FormaPagamento } from '../services/produto.service';

interface Props {
  aberto: boolean;
  totalVenda: number;
  onCancelar: () => void;
  onConfirmar: (forma: FormaPagamento) => void;
}

const OPCOES: { valor: FormaPagamento; label: string; icone: any }[] = [
  { valor: 'CARTAO_DEBITO', label: 'Cartão de Débito', icone: CreditCard },
  { valor: 'CARTAO_CREDITO', label: 'Cartão de Crédito', icone: CreditCard },
  { valor: 'PIX', label: 'PIX', icone: QrCode },
  { valor: 'ESPECIE', label: 'Espécie (Dinheiro)', icone: Banknote },
  { valor: 'FIADO', label: 'Fiado (Contas a Receber)', icone: HandCoins },
];

// Modal de fechamento do PDV: escolhe a forma de pagamento e, se for
// "Espécie", pede o valor recebido pra calcular o troco na hora.
export function PagamentoDialog({ aberto, totalVenda, onCancelar, onConfirmar }: Props) {
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');

  const troco = useMemo(() => {
    const recebido = parseFloat(valorRecebido.replace(',', '.'));
    if (isNaN(recebido)) return null;
    return recebido - totalVenda;
  }, [valorRecebido, totalVenda]);

  const fechar = () => {
    setFormaSelecionada(null);
    setValorRecebido('');
    onCancelar();
  };

  const confirmar = () => {
    if (!formaSelecionada) return;
    if (formaSelecionada === 'ESPECIE' && (troco === null || troco < 0)) return;
    onConfirmar(formaSelecionada);
    setFormaSelecionada(null);
    setValorRecebido('');
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forma de Pagamento — Total: R$ {totalVenda.toFixed(2)}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {OPCOES.map(({ valor, label, icone: Icone }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFormaSelecionada(valor)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
                ${formaSelecionada === valor
                  ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'border-border text-foreground hover:bg-muted'}`}
            >
              <Icone className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {formaSelecionada === 'ESPECIE' && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium text-foreground">Valor recebido do cliente</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              autoFocus
            />
            {troco !== null && (
              <p className={`text-sm font-bold ${troco < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                {troco < 0 ? `Faltam R$ ${Math.abs(troco).toFixed(2)}` : `Troco: R$ ${troco.toFixed(2)}`}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={!formaSelecionada || (formaSelecionada === 'ESPECIE' && (troco === null || troco < 0))}
          >
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
