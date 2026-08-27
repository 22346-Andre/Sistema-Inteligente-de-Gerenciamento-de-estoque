import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CheckCircle, PlusCircle, Wallet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { despesaService, Despesa } from '../services/despesa.service';
import { fornecedorService, Fornecedor } from '../services/fornecedor.service';

// Categorias mais comuns pra um pequeno negócio — o campo aceita texto livre
// também (é uma lista <input> com datalist, não um select travado), pra não
// engessar quem tem uma categoria diferente das sugeridas.
const CATEGORIAS_SUGERIDAS = [
  'Aluguel', 'Salários', 'Energia', 'Água', 'Internet/Telefone',
  'Fornecedor', 'Impostos', 'Manutenção', 'Marketing', 'Outros',
];

function formatarData(dataString?: string | null): string {
  if (!dataString) return '—';
  const data = parseISO(dataString);
  if (!isValid(data)) return '—';
  return format(data, "dd 'de' MMM, yyyy", { locale: ptBR });
}

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaDataVencimento, setNovaDataVencimento] = useState('');
  const [novoFornecedorId, setNovoFornecedorId] = useState('');

  useEffect(() => {
    carregarDados();
    fornecedorService.listarTodos().then(setFornecedores).catch(() => {});
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const lista = await despesaService.listar();
      setDespesas(lista);
    } catch (e) {
      toast.error('Erro ao carregar as despesas.');
    } finally {
      setLoading(false);
    }
  };

  // Total em aberto (Passivo Circulante) — soma tudo que não foi marcado
  // como PAGO ainda, independente da data de vencimento.
  const totalEmAberto = useMemo(
    () => despesas.filter((d) => d.status !== 'PAGO').reduce((soma, d) => soma + d.valor, 0),
    [despesas]
  );

  const handleSalvar = async () => {
    if (!novaDescricao.trim()) {
      toast.error('Informe a descrição da despesa.');
      return;
    }
    if (!novaCategoria.trim()) {
      toast.error('Informe a categoria da despesa.');
      return;
    }
    const valorNumerico = parseFloat(novoValor);
    if (!novoValor || isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    if (!novaDataVencimento) {
      toast.error('Informe a data de vencimento.');
      return;
    }
    if (salvando) return;

    setSalvando(true);
    try {
      await despesaService.registrar({
        descricao: novaDescricao.trim(),
        categoria: novaCategoria.trim(),
        valor: valorNumerico,
        dataVencimento: novaDataVencimento,
        fornecedorId: novoFornecedorId ? Number(novoFornecedorId) : undefined,
      });
      toast.success('Despesa registrada.');
      setModalAberto(false);
      setNovaDescricao(''); setNovaCategoria(''); setNovoValor(''); setNovaDataVencimento(''); setNovoFornecedorId('');
      carregarDados();
    } catch (e) {
      toast.error('Erro ao salvar a despesa.');
    } finally {
      setSalvando(false);
    }
  };

  const handleMarcarPaga = async (id: number) => {
    try {
      await despesaService.marcarComoPaga(id);
      toast.success('Despesa marcada como paga.');
      carregarDados();
    } catch (e) {
      toast.error('Erro ao atualizar a despesa.');
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir esta despesa? Essa ação não pode ser desfeita.')) return;
    try {
      await despesaService.excluir(id);
      toast.success('Despesa excluída.');
      carregarDados();
    } catch (e) {
      toast.error('Erro ao excluir a despesa.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Contas a pagar do seu negócio — aluguel, fornecedores, contas fixas</p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      <Card className="shadow-sm border-l-4 border-l-red-500 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-red-700 dark:text-red-400">Total em Aberto</CardTitle>
          <Wallet className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-foreground dark:text-white">R$ {totalEmAberto.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">
            {despesas.filter((d) => d.status !== 'PAGO').length} conta(s) ainda não paga(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : despesas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma despesa registrada ainda.</TableCell></TableRow>
                ) : (
                  despesas.map((despesa) => (
                    <TableRow key={despesa.id} className={despesa.status === 'PAGO' ? 'opacity-60 bg-muted' : ''}>
                      <TableCell className="font-medium max-w-[220px] truncate">{despesa.descricao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{despesa.categoria}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatarData(despesa.dataVencimento)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold
                          ${despesa.status === 'PAGO' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                            despesa.status === 'ATRASADO' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'}`}>
                          {despesa.status}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${despesa.status === 'PAGO' ? 'text-green-600 dark:text-green-400 line-through' : 'text-red-600 dark:text-red-400'}`}>
                        R$ {despesa.valor.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {despesa.status !== 'PAGO' && (
                            <Button variant="ghost" size="icon" onClick={() => handleMarcarPaga(despesa.id)} title="Marcar como paga">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(despesa.id)} title="Excluir">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
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
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input placeholder="Ex: Aluguel de agosto" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Input
                placeholder="Ex: Aluguel"
                list="categorias-despesa"
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
              />
              <datalist id="categorias-despesa">
                {CATEGORIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input placeholder="Ex: 1200.00" type="number" min="0.01" step="0.01" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Vencimento</label>
              <Input type="date" value={novaDataVencimento} onChange={e => setNovaDataVencimento(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Fornecedor (opcional)</label>
              <select
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                value={novoFornecedorId}
                onChange={e => setNovoFornecedorId(e.target.value)}
              >
                <option value="">Nenhum / despesa genérica</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} className="w-full sm:w-auto" disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Despesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
