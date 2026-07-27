import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MessageCircle, CheckCircle, Clock, Search, PlusCircle, AlertCircle, CalendarClock, Pencil, Wallet, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fiadoService, ContaReceber } from '../services/fiado.service';
import { pixService } from '../services/pix.Service';
import { PixCobrancaDialog } from '../components/PixCobrancaDialog';

// Formata uma data com segurança: se vier vazia/nula ou inválida do backend,
// mostra um traço em vez de quebrar a tela inteira com uma exceção.
function formatarData(dataString?: string | null): string {
  if (!dataString) return '—';
  const data = parseISO(dataString);
  if (!isValid(data)) return '—';
  return format(data, "dd 'de' MMM, yyyy", { locale: ptBR });
}

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [sugestoes, setSugestoes] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [salvando, setSalvando] = useState(false);

 
  const [modalPixAberto, setModalPixAberto] = useState(false);
  const [pixCarregando, setPixCarregando] = useState(false);
  const [pixCopiaECola, setPixCopiaECola] = useState<string | null>(null);
  const [pixErro, setPixErro] = useState<string | null>(null);
  const [pixValor, setPixValor] = useState(0);

  // Estados do Modal de Nova Conta
  const [modalAberto, setModalAberto] = useState(false);
  const [novoCliente, setNovoCliente] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaDataVencimento, setNovaDataVencimento] = useState('');

  // Estados do Modal de Edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCliente, setEditCliente] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editDataVencimento, setEditDataVencimento] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [todas, paraCobrar] = await Promise.all([
        fiadoService.listarCaderneta(),
        fiadoService.listarSugestoesCobranca()
      ]);
      setContas(todas);
      setSugestoes(paraCobrar);
    } catch (e) {
      toast.error('Erro ao carregar as contas a receber.');
    } finally {
      setLoading(false);
    }
  };

  // Validação compartilhada pelos formulários de criar e editar conta.
  const validarFormulario = (cliente: string, telefone: string, valor: string, vencimento: string, exigirTelefone: boolean) => {
    if (!cliente.trim()) {
      toast.error('Informe o nome do cliente.');
      return false;
    }
    if (exigirTelefone && telefone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um WhatsApp válido, com DDD (mínimo 10 dígitos).');
      return false;
    }
    const valorNumerico = parseFloat(valor);
    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Informe um valor maior que zero.');
      return false;
    }
    if (!vencimento) {
      toast.error('Informe a data combinada para pagamento.');
      return false;
    }
    return true;
  };

  const handleSalvarFiado = async () => {
    if (!validarFormulario(novoCliente, novoTelefone, novoValor, novaDataVencimento, true)) return;
    if (salvando) return;

    setSalvando(true);
    try {
      toast.loading('A registrar conta...', { id: 'fiado' });
      await fiadoService.registrarFiado({
        nomeCliente: novoCliente.trim(),
        telefoneCliente: novoTelefone.replace(/\D/g, ''),
        valor: parseFloat(novoValor),
        descricao: novaDescricao.trim() || 'Compras diversas',
        dataVencimento: novaDataVencimento,
      });
      toast.success('Adicionado às Contas a Receber com sucesso!', { id: 'fiado' });
      setModalAberto(false);
      setNovoCliente(''); setNovoTelefone(''); setNovoValor(''); setNovaDescricao(''); setNovaDataVencimento('');
      carregarDados();
    } catch (e) {
      toast.error('Erro ao salvar.', { id: 'fiado' });
    } finally {
      setSalvando(false);
    }
  };

  // Função para abrir o modal de edição com os dados preenchidos
  const handleAbrirEdicao = (conta: ContaReceber) => {
    setEditId(conta.id);
    setEditCliente(conta.nomeCliente);
    setEditTelefone(conta.telefoneCliente || '');
    setEditValor(conta.valor.toString());
    setEditDescricao(conta.descricao || '');
    setEditDataVencimento(conta.dataVencimento);
    setModalEdicaoAberto(true);
  };

  // Função para salvar a edição
  const handleSalvarEdicao = async () => {
    if (!editId) return;
    if (!validarFormulario(editCliente, editTelefone, editValor, editDataVencimento, false)) return;
    if (salvando) return;

    setSalvando(true);
    try {
      toast.loading('A atualizar conta...', { id: 'edit-fiado' });
      await fiadoService.atualizarFiado(editId, {
        nomeCliente: editCliente.trim(),
        telefoneCliente: editTelefone.replace(/\D/g, ''),
        valor: parseFloat(editValor),
        descricao: editDescricao.trim() || 'Compras diversas',
        dataVencimento: editDataVencimento,
      });
      toast.success('Registro atualizado com sucesso!', { id: 'edit-fiado' });
      setModalEdicaoAberto(false);
      carregarDados();
    } catch (e) {
      toast.error('Erro ao atualizar o registro.', { id: 'edit-fiado' });
    } finally {
      setSalvando(false);
    }
  };

  const handleCobrarWhatsApp = async (contaId: number) => {
    try {
      const link = await fiadoService.obterLinkWhatsApp(contaId);
      window.open(link, '_blank');
      toast.success('WhatsApp aberto! Envie a mensagem ao cliente.');
    } catch (e) {
      toast.error('Erro ao gerar link de cobrança.');
    }
  };

  
  const handleCobrarPix = async (contaId: number, valor: number) => {
    setPixValor(valor);
    setPixCopiaECola(null);
    setPixErro(null);
    setModalPixAberto(true);
    setPixCarregando(true);
    try {
      const copiaECola = await pixService.gerarCobrancaFiado(contaId);
      setPixCopiaECola(copiaECola);
    } catch (error: any) {
      setPixErro(error?.response?.data?.erro || 'Erro ao gerar a cobrança PIX. Verifique se a chave PIX está configurada em Configurações > Empresa.');
    } finally {
      setPixCarregando(false);
    }
  };

  const handleMarcarPago = async (contaId: number) => {
    try {
      await fiadoService.marcarComoPago(contaId);
      toast.success('Boa! Conta marcada como paga.');
      carregarDados();
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleAdiarCobranca = async (contaId: number, dias: number) => {
    try {
      await fiadoService.adiarCobranca(contaId, dias);
      toast.success(`Lembrete adiado em ${dias} dias.`);
      carregarDados();
    } catch (e) {
      toast.error('Erro ao adiar cobrança.');
    }
  };

  const contasFiltradas = contas.filter(c =>
    c.nomeCliente.toLowerCase().includes(termoBusca.toLowerCase()) ||
    (c.telefoneCliente || '').includes(termoBusca)
  );

  const totalEmAberto = contas
    .filter(c => c.status !== 'PAGO')
    .reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-7 w-7 text-blue-500" /> Contas a Receber
          </h1>
          <p className="text-muted-foreground">Gerencie quem lhe deve e faça cobranças automáticas pelo WhatsApp.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total em aberto</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {totalEmAberto.toFixed(2)}</p>
          </div>
          <Button onClick={() => setModalAberto(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="w-5 h-5 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sugestoes" className="w-full">
        <TabsList className="mb-6 bg-card border border-border shadow-sm">
          <TabsTrigger value="sugestoes" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-400">
            <AlertCircle className="w-4 h-4 mr-2" /> Para Cobrar Hoje ({sugestoes.length})
          </TabsTrigger>
          <TabsTrigger
            value="todas"
            className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400"
          >
            <Clock className="w-4 h-4 mr-2" /> Todas as Contas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugestoes">
          <Card className="border-orange-500/20 shadow-md">
            <CardHeader className="bg-orange-500/5 border-b border-orange-500/10">
              <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" /> Chegou a hora de cobrar!
              </CardTitle>
              <CardDescription>Estes clientes já chegaram à data combinada de lembrete (ou estão atrasados).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">A carregar...</div>
              ) : sugestoes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400/60 mb-3" />
                  <p className="text-lg font-medium text-foreground">Tudo em dia!</p>
                  <p>Não há clientes para cobrar hoje.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sugestoes.map(conta => (
                    <Card key={conta.id} className="border border-border overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`h-2 w-full ${conta.status === 'ATRASADO' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-foreground">{conta.nomeCliente}</h3>
                            <p className="text-sm text-muted-foreground">{conta.descricao}</p>
                          </div>
                          <span className="font-black text-xl text-red-600 dark:text-red-400">R$ {conta.valor.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-4 bg-muted p-2 rounded flex justify-between items-center">
                          <p>Venceu em: <strong className="text-foreground">{formatarData(conta.dataVencimento)}</strong></p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700" onClick={() => handleAbrirEdicao(conta)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Button onClick={() => handleCobrarWhatsApp(conta.id)} className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                            <MessageCircle className="w-4 h-4 mr-2" /> Cobrar no WhatsApp
                          </Button>
                          <Button onClick={() => handleCobrarPix(conta.id, conta.valor)} variant="outline" className="w-full border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10">
                            <QrCode className="w-4 h-4 mr-2" /> Gerar cobrança PIX
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => handleAdiarCobranca(conta.id, 5)} className="text-muted-foreground text-xs">
                              <CalendarClock className="w-3 h-3 mr-1" /> Pediu +5 dias
                            </Button>
                            <Button variant="outline" onClick={() => handleMarcarPago(conta.id)} className="text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/10 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> Recebi
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <CardTitle>Todos os Registros</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Procurar por nome ou telefone..." className="pl-9" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Resumo</TableHead>
                      <TableHead>Próximo Lembrete</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasFiltradas.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
                    ) : (
                      contasFiltradas.map(conta => (
                        <TableRow key={conta.id} className={conta.status === 'PAGO' ? 'opacity-60 bg-muted' : ''}>
                          <TableCell className="font-medium">{conta.nomeCliente}<br/><span className="text-xs text-muted-foreground">{conta.telefoneCliente || 'sem telefone'}</span></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{conta.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {conta.status === 'PAGO' ? '—' : formatarData(conta.dataProximaCobranca)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                              ${conta.status === 'PAGO' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                                conta.status === 'ATRASADO' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'}`}>
                              {conta.status}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${conta.status === 'PAGO' ? 'text-green-600 dark:text-green-400 line-through' : 'text-red-600 dark:text-red-400'}`}>
                            R$ {conta.valor.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleAbrirEdicao(conta)} disabled={conta.status === 'PAGO'} title="Editar registro">
                              <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL NOVA CONTA */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome do Cliente</label>
              <Input placeholder="Ex: João Silva" value={novoCliente} onChange={e => setNovoCliente(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp do Cliente (com DDD)</label>
              <Input placeholder="Ex: 11988887777" type="tel" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor Total (R$)</label>
              <Input placeholder="Ex: 150.50" type="number" min="0.01" step="0.01" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Resumo da Compra</label>
              <Input placeholder="Ex: Fardo de Coca-Cola e Salgados" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data Combinada para Pagamento</label>
              <Input type="date" value={novaDataVencimento} onChange={e => setNovaDataVencimento(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">O sistema vai lembrar de cobrar nesta data exata.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} className="w-full sm:w-auto" disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvarFiado} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR CONTA */}
      <Dialog open={modalEdicaoAberto} onOpenChange={setModalEdicaoAberto}>
        <DialogContent className="sm:max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Editar Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome do Cliente</label>
              <Input placeholder="Ex: João Silva" value={editCliente} onChange={e => setEditCliente(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp do Cliente</label>
              <Input placeholder="Ex: 11988887777" type="tel" value={editTelefone} onChange={e => setEditTelefone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor Total (R$)</label>
              <Input placeholder="Ex: 150.50" type="number" min="0.01" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Resumo da Compra</label>
              <Input placeholder="Ex: Fardo de Coca-Cola e Salgados" value={editDescricao} onChange={e => setEditDescricao(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data Combinada para Pagamento</label>
              <Input type="date" value={editDataVencimento} onChange={e => setEditDataVencimento(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">O alerta de cobrança será ajustado para esta nova data.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEdicaoAberto(false)} className="w-full sm:w-auto" disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Atualizar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      <PixCobrancaDialog
        open={modalPixAberto}
        onOpenChange={setModalPixAberto}
        valor={pixValor}
        carregando={pixCarregando}
        copiaECola={pixCopiaECola}
        erro={pixErro}
      />
    </div>
  );
}
