import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Wallet, PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { caixaService, MovimentoCaixa } from '../services/caixa.service';

const ROTULOS_ORIGEM: Record<string, string> = {
  VENDA_PDV: 'Venda (PDV)',
  RECEBIMENTO_FIADO: 'Recebimento de Fiado',
  PAGAMENTO_DESPESA: 'Pagamento de Despesa',
  APORTE_SOCIO: 'Aporte de Sócio',
  RETIRADA_SOCIO: 'Retirada de Sócio',
  COMPRA_MERCADORIA: 'Compra de Mercadoria',
  OUTRO: 'Outro',
};

function formatarDataHora(dataString?: string | null): string {
  if (!dataString) return '—';
  const data = parseISO(dataString);
  if (!isValid(data)) return '—';
  return format(data, "dd 'de' MMM, HH:mm", { locale: ptBR });
}

export default function Caixa() {
  const [extrato, setExtrato] = useState<MovimentoCaixa[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<'APORTE_SOCIO' | 'RETIRADA_SOCIO' | 'OUTRO'>('APORTE_SOCIO');
  const [entradaOuSaidaDeOutro, setEntradaOuSaidaDeOutro] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [valorLancamento, setValorLancamento] = useState('');
  const [descricaoLancamento, setDescricaoLancamento] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [extratoResp, saldoResp] = await Promise.all([
        caixaService.listarExtrato(),
        caixaService.obterSaldo(),
      ]);
      setExtrato(extratoResp);
      setSaldo(saldoResp);
    } catch (e) {
      toast.error('Erro ao carregar o caixa.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarLancamento = async () => {
    const valorNumerico = parseFloat(valorLancamento);
    if (!valorLancamento || isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    if (salvando) return;

    setSalvando(true);
    try {
      // Aporte de sócio é sempre ENTRADA, retirada é sempre SAIDA — "Outro"
      // o usuário escolhe qual dos dois é.
      const tipo: 'ENTRADA' | 'SAIDA' =
        tipoLancamento === 'APORTE_SOCIO' ? 'ENTRADA' :
        tipoLancamento === 'RETIRADA_SOCIO' ? 'SAIDA' :
        entradaOuSaidaDeOutro;

      await caixaService.registrarLancamentoManual({
        tipo,
        origem: tipoLancamento,
        valor: valorNumerico,
        descricao: descricaoLancamento.trim() || undefined,
      });
      toast.success('Lançamento registrado.');
      setModalAberto(false);
      setValorLancamento(''); setDescricaoLancamento('');
      carregarDados();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || e?.response?.data?.message || 'Erro ao registrar o lançamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground">Extrato de entradas e saídas reais de dinheiro</p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="w-4 h-4 mr-2" /> Lançamento Manual
        </Button>
      </div>

      <Card className="shadow-sm border-l-4 border-l-emerald-500 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Saldo Atual em Caixa</CardTitle>
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-foreground dark:text-white">R$ {saldo.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">
            Somatório de todas as entradas menos todas as saídas desde o início
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : extrato.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum lançamento ainda.</TableCell></TableRow>
                ) : (
                  extrato.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatarDataHora(mov.dataMovimento)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          {mov.tipo === 'ENTRADA'
                            ? <ArrowUpCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                            : <ArrowDownCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
                          {ROTULOS_ORIGEM[mov.origem] || mov.origem}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">{mov.descricao || '—'}</TableCell>
                      <TableCell className={`text-right font-bold ${mov.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {mov.tipo === 'ENTRADA' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Lançamento Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Vendas, fiados recebidos e despesas pagas entram no caixa sozinhos. Use isto só pra dinheiro que entrou
              ou saiu sem passar por essas telas — aporte do sócio, retirada, ou algo avulso.
            </p>
            <div>
              <label className="text-sm font-medium">Tipo de lançamento</label>
              <select
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                value={tipoLancamento}
                onChange={e => setTipoLancamento(e.target.value as typeof tipoLancamento)}
              >
                <option value="APORTE_SOCIO">Aporte de Sócio (entrada)</option>
                <option value="RETIRADA_SOCIO">Retirada de Sócio (saída)</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            {tipoLancamento === 'OUTRO' && (
              <div>
                <label className="text-sm font-medium">É uma entrada ou saída?</label>
                <select
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  value={entradaOuSaidaDeOutro}
                  onChange={e => setEntradaOuSaidaDeOutro(e.target.value as 'ENTRADA' | 'SAIDA')}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input placeholder="Ex: 500.00" type="number" min="0.01" step="0.01" value={valorLancamento} onChange={e => setValorLancamento(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input placeholder="Ex: Aporte inicial de capital" value={descricaoLancamento} onChange={e => setDescricaoLancamento(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} className="w-full sm:w-auto" disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvarLancamento} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
