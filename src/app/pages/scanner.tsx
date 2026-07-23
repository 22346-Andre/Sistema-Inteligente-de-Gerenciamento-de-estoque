

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Camera, Plus, UploadCloud, FileCode, Trash2, Barcode, FileUp, CheckCircle, Search, Clock, FileText, ShoppingCart, AlertTriangle, Printer, Info, XCircle, PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { produtoService, Produto } from '../services/produto.service';
 
interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}
 
// Mapeamento de tipo de movimentação -> como exibir no histórico.
// Centralizado aqui pra não espalhar "se ENTRADA então azul senão verde" pelo JSX
// (era isso que fazia QUEBRA_PERDA aparecer com a mesma cor de uma venda).
const TIPO_MOVIMENTACAO_INFO: Record<string, { label: string; badge: string }> = {
  ENTRADA: { label: 'Entrada', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  SAIDA: { label: 'Venda', badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  QUEBRA_PERDA: { label: 'Perda/Quebra', badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};
 
function infoTipoMovimentacao(tipo: string) {
  return TIPO_MOVIMENTACAO_INFO[tipo] ?? { label: tipo, badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}
 
/**
 * Extrai uma mensagem legível dos formatos de erro que a API pode devolver:
 * - string pura (é o que o ImportacaoController retorna hoje: BAD_REQUEST/CONFLICT/
 *   INTERNAL_SERVER_ERROR com .body(String))
 * - { erro: string, detalhes?: {...} } (formato do TratadorDeErros global)
 * - { message: string } (formato manual usado pelo MovimentacaoController no /pdv)
 * - fallback para error.message (erro de rede, timeout, CORS, etc.)
 *
 * Mesmo padrão já usado em importacao.tsx e fornecedores.tsx — mantenha os três
 * sincronizados se decidir centralizar isso em api.ts no futuro.
 */
function extrairMensagemErro(error: any, fallback: string): string {
  const data = error?.response?.data;
 
  if (typeof data === 'string' && data.trim()) return data;
 
  if (data && typeof data === 'object') {
    if (data.detalhes && typeof data.detalhes === 'object') {
      const mensagens = Object.values(data.detalhes).filter(Boolean);
      if (mensagens.length) return mensagens.join(' | ');
    }
    if (typeof data.erro === 'string' && data.erro) return data.erro;
    if (typeof data.message === 'string' && data.message) return data.message;
  }
 
  if (error?.message === 'Network Error') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
 
  return error?.message || fallback;
}
 
export default function ScannerPDV() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [inputBuscaFocado, setInputBuscaFocado] = useState(false);
 
  // CARRINHO
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
 
  // SCANNER
  const [codigoBarras, setCodigoBarras] = useState('');
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
 
  // HISTÓRICO
  const [historicoAgrupado, setHistoricoAgrupado] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
 
  // XML
  // 🟢 CORRIGIDO: o backend (/importacao/xml-direto) extrai E salva em uma
  // única chamada, devolvendo um relatório em texto — não uma lista de itens
  // pra confirmar em duas etapas. "resultados" agora guarda esse texto.
  const [file, setFile] = useState<File | null>(null);
  const [relatorioImportacao, setRelatorioImportacao] = useState<string | null>(null);
  const [loadingXml, setLoadingXml] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  // ESTADOS DO MODAL DE PERDAS
  const [modalPerdaAberto, setModalPerdaAberto] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState('');
 
  useEffect(() => {
    carregarProdutos();
    carregarHistorico();
  }, []);
 
  const carregarProdutos = async () => {
    try {
      setProdutos(await produtoService.listarTodos());
    } catch (error) {
      toast.error('Erro ao carregar catálogo de produtos.');
    }
  };
 
  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const res = await api.get('/movimentacoes');
 
      const agrupado = res.data.reduce((acc: any, mov: any) => {
        const isLoteValid = mov.chaveNotaFiscal && mov.chaveNotaFiscal.trim().length > 0;
        const chaveAgrupamento = isLoteValid ? mov.chaveNotaFiscal : `avulso-${new Date(mov.dataMovimentacao).getTime()}`;
 
        if (!acc[chaveAgrupamento]) {
          acc[chaveAgrupamento] = {
            chaveReal: isLoteValid ? mov.chaveNotaFiscal : mov.id.toString(),
            chaveExibicao: chaveAgrupamento,
            data: mov.dataMovimentacao,
            tipo: mov.tipo,
            totalItens: 0,
            valorTotal: 0,
            nomes: [],
            isLote: isLoteValid
          };
        }
 
        acc[chaveAgrupamento].totalItens += mov.quantidade;
 
        // Base de valor correta por tipo de operação: uma ENTRADA (compra) ou uma
        // PERDA (prejuízo/custo perdido) devem ser valoradas pelo preço de CUSTO;
        // só uma VENDA de fato realiza o preço de venda. Antes, o cálculo sempre
        // priorizava precoVenda, mesmo pra compras — o que inflava o valor exibido
        // em qualquer entrada de mercadoria.
        const precoBase = mov.tipo === 'SAIDA'
          ? (mov.produto?.precoVenda ?? mov.produto?.precoCusto ?? 0)
          : (mov.produto?.precoCusto ?? mov.produto?.precoVenda ?? 0);
        acc[chaveAgrupamento].valorTotal += mov.quantidade * precoBase;
 
        if (acc[chaveAgrupamento].nomes.length < 2 && !acc[chaveAgrupamento].nomes.includes(mov.produto?.nome)) {
          acc[chaveAgrupamento].nomes.push(mov.produto?.nome);
        }
        return acc;
      }, {});
 
      setHistoricoAgrupado(Object.values(agrupado).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    } catch (e) {
      console.error("Erro ao carregar histórico", e);
    } finally {
      setCarregandoHistorico(false);
    }
  };
 
  useEffect(() => {
    if (inputRef.current && !scannerAtivo && !inputBuscaFocado && !modalPerdaAberto) inputRef.current.focus();
  }, [scannerAtivo, codigoBarras, inputBuscaFocado, modalPerdaAberto]);
 
  const processarCodigoLido = (codigo: string) => {
    const produtoEncontrado = produtos.find(p => p.codigoBarras === codigo);
    if (produtoEncontrado) {
      adicionarAoCarrinho(produtoEncontrado);
    } else {
      toast.error(`Código ${codigo} não encontrado!`);
    }
    setCodigoBarras('');
  };
 
  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.produto.id === produto.id);
      const qtdAtual = existente ? existente.quantidade : 0;
 
      // Trava no estoque disponível em vez de deixar acumular infinitamente e só
      // avisar lá na frente, na hora de finalizar a venda.
      if (produto.quantidade > 0 && qtdAtual + 1 > produto.quantidade) {
        toast.warning(`Estoque máximo atingido para "${produto.nome}" (${produto.quantidade} disponíveis).`);
        return prev;
      }
 
      if (existente) {
        toast.success(`${produto.nome} — quantidade atualizada.`);
        return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      toast.success(`${produto.nome} adicionado ao carrinho!`);
      return [...prev, { produto, quantidade: 1 }];
    });
    setTermoBusca('');
  };
 
  const alterarQuantidade = (produtoId: number, novaQtd: number) => {
    if (novaQtd < 1) return;
    setCarrinho(prev => prev.map(item => {
      if (item.produto.id !== produtoId) return item;
      if (item.produto.quantidade > 0 && novaQtd > item.produto.quantidade) {
        toast.warning(`Estoque máximo atingido para "${item.produto.nome}" (${item.produto.quantidade} disponíveis).`);
        return item;
      }
      return { ...item, quantidade: novaQtd };
    }));
  };
 
  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho(prev => prev.filter(item => item.produto.id !== produtoId));
  };
 
  const limparCarrinho = () => setCarrinho([]);
 
  const totalCarrinho = carrinho.reduce((acc, item) => acc + ((item.produto.precoVenda || item.produto.precoCusto || 0) * item.quantidade), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const carrinhoExcedeEstoque = carrinho.some(item => item.quantidade > item.produto.quantidade);
 
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (scannerAtivo) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 150 } }, false);
      scanner.render((decodedText) => { setScannerAtivo(false); scanner?.clear(); processarCodigoLido(decodedText); }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerAtivo]);
 
  const handleKeyDownPistola = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (codigoBarras.trim() === '') return;
      processarCodigoLido(codigoBarras.trim());
    }
  };
 
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    (p.codigoBarras && p.codigoBarras.includes(termoBusca))
  );
 
  const handleBaixarNF = async (grp: any, tipoFormato: 'danfe' | 'cupom') => {
    try {
      toast.loading(`A gerar ${tipoFormato === 'danfe' ? 'DANFE A4' : 'Cupom'}...`, { id: 'nf' });
      const urlPath = grp.isLote ? `/relatorios/${tipoFormato}/lote/${grp.chaveReal}/pdf` : `/relatorios/${tipoFormato}/${grp.chaveReal}/pdf`;
      const response = await api.get(urlPath, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `${tipoFormato}_operacao_${grp.chaveReal}.pdf`); document.body.appendChild(link); link.click();
      toast.success("Impresso com sucesso!", { id: 'nf' });
    } catch (e) {
      toast.error(extrairMensagemErro(e, "Erro na impressão. O ficheiro pode não existir."), { id: 'nf' });
    }
  };
 
  const handleFinalizar = async (tipo: 'SAIDA' | 'ENTRADA') => {
    if (carrinho.length === 0) return;
 
    if (tipo === 'SAIDA') {
      for (const item of carrinho) {
        if (item.quantidade > item.produto.quantidade) {
          toast.error(`Estoque insuficiente para: ${item.produto.nome} (Saldo: ${item.produto.quantidade})`);
          return;
        }
      }
    }
 
    let itensProcessados = 0;
    try {
      toast.loading(`A processar ${tipo === 'SAIDA' ? 'Venda' : 'Entrada'}...`, { id: 'op' });
      const chaveUnica = Array.from({length: 15}, () => Math.floor(Math.random() * 10)).join('');
 
      for (const item of carrinho) {
        if (tipo === 'SAIDA') {
          await produtoService.registrarSaida(item.produto.id, {
            quantidadeDesejada: item.quantidade,
            motivo: "Venda Caixa PDV",
            chaveNotaFiscal: chaveUnica
          });
        } else {
          await api.post(`/produtos/${item.produto.id}/lotes`, { quantidade: item.quantidade, novoPrecoCompra: item.produto.precoCusto });
        }
        itensProcessados++;
      }
 
      toast.success("Operação concluída com sucesso!", { id: 'op' });
      setCarrinho([]);
      carregarProdutos();
      carregarHistorico();
 
      if (tipo === 'SAIDA') {
         const pseudoGrupo = { chaveReal: chaveUnica, isLote: true };
         handleBaixarNF(pseudoGrupo, 'cupom');
      }
    } catch (error: any) {
      // Se parte do carrinho já foi processada antes do erro, o estoque real já
      // mudou no backend — atualiza a tela pra refletir isso em vez de deixar
      // números desatualizados na frente do operador do caixa.
      const mensagemBase = extrairMensagemErro(error, 'Erro ao finalizar a operação.');
      const mensagem = itensProcessados > 0
        ? `${mensagemBase} (${itensProcessados} de ${carrinho.length} itens já foram processados antes da falha)`
        : mensagemBase;
      toast.error(mensagem, { id: 'op' });
 
      if (itensProcessados > 0) {
        carregarProdutos();
        carregarHistorico();
      }
    }
  };
 
  const handleRegistrarPerda = async () => {
    if (carrinho.length === 0) return;
    if (!motivoPerda.trim()) {
      toast.error("É obrigatório informar o motivo da perda.");
      return;
    }
 
    for (const item of carrinho) {
      if (item.quantidade > item.produto.quantidade) return toast.error(`Estoque insuficiente para a perda: ${item.produto.nome}`);
    }
 
    let itensProcessados = 0;
    try {
      toast.loading(`A registar perda no sistema...`, { id: 'perda' });
      const chaveUnica = Array.from({length: 15}, () => Math.floor(Math.random() * 10)).join('');
 
      for (const item of carrinho) {
        await produtoService.registrarSaida(item.produto.id, {
          quantidadeDesejada: item.quantidade,
          tipo: 'QUEBRA_PERDA',
          motivo: motivoPerda,
          chaveNotaFiscal: chaveUnica
        });
        itensProcessados++;
      }
 
      toast.success("Quebra/Perda registada com sucesso!", { id: 'perda' });
      setModalPerdaAberto(false);
      setMotivoPerda('');
      limparCarrinho();
      carregarProdutos();
      carregarHistorico();
    } catch (error: any) {
      const mensagemBase = extrairMensagemErro(error, 'Erro ao registar a perda.');
      const mensagem = itensProcessados > 0
        ? `${mensagemBase} (${itensProcessados} de ${carrinho.length} itens já foram registados antes da falha)`
        : mensagemBase;
      toast.error(mensagem, { id: 'perda' });
 
      if (itensProcessados > 0) {
        carregarProdutos();
        carregarHistorico();
      }
    }
  };
 
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) validarEGuardarArquivo(e.dataTransfer.files[0]); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) validarEGuardarArquivo(e.target.files[0]); };
  const validarEGuardarArquivo = (arquivo: File) => {
    if (!arquivo.name.toLowerCase().endsWith('.xml') && arquivo.type !== 'text/xml') return toast.error('Formato inválido! Envie .xml');
    setFile(arquivo);
    setRelatorioImportacao(null);
  };
 
  // 🟢 CORRIGIDO: o backend não tem uma rota de "prévia" — POST /importacao/xml-direto
  // já extrai os dados do XML da nota E salva os produtos/lotes no estoque em uma
  // única chamada, retornando uma String de relatório (igual ao fluxo já usado em
  // importacao.tsx). O antigo par de rotas '/importacao/processar-xml' +
  // '/importacao/salvar' não existe no ImportacaoController e sempre resultava em 404.
  const handleProcessarXML = async () => {
    if (!file) return;
    try {
      setLoadingXml(true);
      const formData = new FormData();
      formData.append('ficheiro', file); // mesmo nome de campo aceito pelo backend (ImportacaoController)
 
      const response = await api.post('/importacao/xml-direto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
 
      const relatorio = typeof response.data === 'string' ? response.data : 'Nota Fiscal processada e salva com sucesso!';
      setRelatorioImportacao(relatorio);
      toast.success("Nota Fiscal lida e salva no estoque com sucesso!");
 
      carregarProdutos();
      carregarHistorico();
    } catch (error: any) {
      // 409 = NotaFiscalDuplicadaException (chave de acesso já importada antes)
      toast.error(extrairMensagemErro(error, "Erro ao processar o XML da Nota Fiscal."));
    } finally {
      setLoadingXml(false);
    }
  };
 
  const limparImportacaoXml = () => {
    setFile(null);
    setRelatorioImportacao(null);
  };
 
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Caixa / PDV Aberto</h1>
        <p className="text-sm md:text-base text-muted-foreground">Passe os produtos no leitor para adicionar ao carrinho.</p>
      </div>
 
      <Tabs defaultValue="pdv" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4">
          <TabsList className="flex w-full min-w-max md:grid md:grid-cols-3 md:w-full md:max-w-2xl">
            <TabsTrigger value="pdv" className="gap-2 flex-1"><ShoppingCart className="h-4 w-4" /> Frente de Caixa</TabsTrigger>
            <TabsTrigger value="xml" className="gap-2 flex-1"><FileUp className="h-4 w-4" /> Importar NF-e</TabsTrigger>
            <TabsTrigger value="historico" className="gap-2 flex-1"><Clock className="h-4 w-4" /> Histórico</TabsTrigger>
          </TabsList>
        </div>
 
        <TabsContent value="pdv">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 
            <Card className="lg:col-span-5 border-t-4 border-t-blue-500 shadow-md flex flex-col bg-card border-border">
              <CardHeader className="pb-3 bg-muted/60 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-blue-500" /> Leitor de Código
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col">
                <input
                  type="text" ref={inputRef} className="opacity-0 absolute w-0 h-0"
                  value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} onKeyDown={handleKeyDownPistola}
                />
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou código..."
                    className="pl-10 h-14 text-lg bg-background border-2 border-blue-500/20 focus-visible:ring-blue-500 rounded-xl w-full"
                    value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} onFocus={() => setInputBuscaFocado(true)} onBlur={() => setInputBuscaFocado(false)}
                  />
                </div>
 
                {termoBusca ? (
                  <div className="border border-border rounded-xl flex-1 overflow-y-auto bg-background shadow-inner p-2 max-h-[400px]">
                    {produtosFiltrados.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground">Nenhum produto encontrado.</p>
                    ) : (
                      produtosFiltrados.map((p) => {
                        const semEstoque = p.quantidade <= 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => !semEstoque && adicionarAoCarrinho(p)}
                            className={`p-3 mb-2 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center transition-colors gap-2 ${
                              semEstoque
                                ? 'border-border/50 opacity-50 cursor-not-allowed'
                                : 'border-border hover:bg-blue-500/5 hover:border-blue-500/30 cursor-pointer'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-foreground text-sm sm:text-base">{p.nome}</p>
                              <p className="text-xs font-mono text-muted-foreground">{p.codigoBarras || 'S/N'}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">R$ {(p.precoVenda || p.precoCusto || 0).toFixed(2)}</p>
                              <p className={`text-xs ${semEstoque ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                {semEstoque ? 'Sem estoque' : `Estoque: ${p.quantidade}`}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/40 p-6 min-h-[250px]">
                    {scannerAtivo ? (
                      <div id="reader" className="w-full max-w-sm mx-auto"></div>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => setScannerAtivo(true)}>
                        <div className="bg-card p-4 rounded-full shadow-sm inline-block mb-4 border border-border"><Camera className="h-12 w-12 text-blue-500" /></div>
                        <h3 className="font-bold text-foreground">Scanner da Câmera</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Toque para ativar a câmera.<br/>A pistola USB já está ativa.</p>
                      </div>
                    )}
                    {scannerAtivo && <Button variant="outline" className="mt-4 text-red-600 w-full sm:w-auto" onClick={() => setScannerAtivo(false)}>Fechar Câmera</Button>}
                  </div>
                )}
              </CardContent>
            </Card>
 
            <Card className="lg:col-span-7 shadow-lg border-border bg-card flex flex-col w-full overflow-hidden">
              <CardHeader className="bg-foreground/95 text-background rounded-t-xl pb-4 border-b border-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-background"><ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" /> Carrinho</CardTitle>
                  <span className="bg-background/10 px-3 py-1 rounded-full text-xs font-mono self-start sm:self-auto border border-background/20">Caixa Livre</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 w-full">
 
                <div className="flex-1 min-h-[300px] max-h-[400px] overflow-x-auto overflow-y-auto bg-muted/20 p-2 w-full">
                  {carrinho.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 w-full">
                      <ShoppingCart className="h-16 w-16 sm:h-20 sm:w-20 mb-4" />
                      <p className="text-base sm:text-lg font-medium text-center">O carrinho está vazio</p>
                      <p className="text-xs sm:text-sm text-center">Passe os produtos no leitor.</p>
                    </div>
                  ) : (
                    <div className="min-w-[600px]">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-transparent border-b-2 border-border">
                            <TableHead className="w-[10%]">Item</TableHead>
                            <TableHead className="w-[40%]">Produto</TableHead>
                            <TableHead className="text-center w-[20%]">Qtd</TableHead>
                            <TableHead className="text-right w-[20%]">Subtotal</TableHead>
                            <TableHead className="w-[10%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {carrinho.map((item, index) => {
                            const preco = item.produto.precoVenda || item.produto.precoCusto || 0;
                            const excedeEstoque = item.quantidade > item.produto.quantidade;
                            return (
                              <TableRow
                                key={item.produto.id}
                                className={`border-b border-border/50 bg-card ${excedeEstoque ? 'bg-red-500/5' : ''}`}
                              >
                                <TableCell className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(3, '0')}</TableCell>
                                <TableCell className="font-bold text-foreground text-sm sm:text-base">
                                  <span className="block truncate max-w-[220px]" title={item.produto.nome}>{item.produto.nome}</span>
                                  {excedeEstoque && (
                                    <span className="flex items-center gap-1 text-[11px] font-normal text-red-500 mt-0.5">
                                      <PackageX className="h-3 w-3" /> Só {item.produto.quantidade} em estoque
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center border border-border rounded-md overflow-hidden bg-muted max-w-[100px] mx-auto">
                                    <button onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)} className="px-2 py-1 hover:bg-muted-foreground/10 text-foreground">-</button>
                                    <span className="px-2 font-bold bg-card w-8 text-center text-sm border-x border-border">{item.quantidade}</span>
                                    <button onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)} className="px-2 py-1 hover:bg-muted-foreground/10 text-foreground">+</button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">R$ {(preco * item.quantidade).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => removerDoCarrinho(item.produto.id)} className="text-red-400 hover:text-red-600 hover:bg-red-500/10 h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
 
                <div className="bg-muted/40 border-t border-border p-4 sm:p-6 rounded-b-xl w-full">
                  <div className="flex flex-row justify-between items-center mb-4 sm:mb-6">
                    <div className="text-muted-foreground">
                      <p className="text-xs sm:text-sm font-medium">Quantidade</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{totalItens}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">TOTAL A PAGAR</p>
                      <p className="text-2xl sm:text-4xl font-black text-green-600 dark:text-green-400 tracking-tight">R$ {totalCarrinho.toFixed(2)}</p>
                    </div>
                  </div>
 
                  {carrinhoExcedeEstoque && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Algum item do carrinho está com quantidade acima do estoque disponível. Ajuste antes de vender ou registrar perda.
                    </div>
                  )}
 
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 w-full">
                    <Button
                      variant="outline"
                      className="h-12 sm:h-14 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 w-full"
                      onClick={() => handleFinalizar('ENTRADA')}
                      disabled={carrinho.length === 0}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Entrada
                    </Button>
 
                    <Button
                      variant="outline"
                      className="h-12 sm:h-14 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 w-full"
                      onClick={() => setModalPerdaAberto(true)}
                      disabled={carrinho.length === 0 || carrinhoExcedeEstoque}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> Perda
                    </Button>
 
                    <Button
                      className="h-12 sm:h-14 bg-green-600 hover:bg-green-700 text-white shadow-lg w-full"
                      onClick={() => handleFinalizar('SAIDA')}
                      disabled={carrinho.length === 0 || carrinhoExcedeEstoque}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Vender
                    </Button>
                  </div>
 
                  <Button variant="ghost" className="w-full text-muted-foreground hover:bg-muted hover:text-foreground h-10 sm:h-12" onClick={limparCarrinho} disabled={carrinho.length === 0}>
                    <XCircle className="w-4 h-4 mr-2" /> Cancelar Compra
                  </Button>
 
                </div>
 
              </CardContent>
            </Card>
          </div>
        </TabsContent>
 
        <TabsContent value="historico">
          <Card className="overflow-hidden w-full bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle>Histórico de Transações do Caixa</CardTitle>
              <CardDescription>Compras de múltiplos items aparecem agrupadas no mesmo recibo.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 w-full">
              {carregandoHistorico ? (
                <div className="text-center py-8 text-muted-foreground">A consultar a base de dados...</div>
              ) : historicoAgrupado.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg m-4 border border-border">Sem histórico de operações recente.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <div className="min-w-[800px] p-4 sm:p-0">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Resumo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Recibos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historicoAgrupado.slice(0, 30).map(grp => {
                          const infoTipo = infoTipoMovimentacao(grp.tipo);
                          return (
                            <TableRow key={grp.chaveExibicao} className="hover:bg-muted/50">
                              <TableCell className="whitespace-nowrap font-medium text-foreground text-xs sm:text-sm">{format(new Date(grp.data), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell className="text-xs sm:text-sm text-muted-foreground max-w-[150px] sm:max-w-[250px] truncate" title={grp.nomes.join(', ')}>
                                {grp.nomes.join(', ')} {grp.totalItens > grp.nomes.length ? '...' : ''}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${infoTipo.badge}`}>{infoTipo.label}</span>
                              </TableCell>
                              <TableCell className="font-bold text-right text-foreground text-sm">{grp.totalItens}</TableCell>
                              <TableCell className={`font-bold text-right text-sm ${grp.tipo === 'QUEBRA_PERDA' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                {grp.tipo === 'QUEBRA_PERDA' ? '- ' : ''}R$ {grp.valorTotal.toFixed(2)}
                              </TableCell>
 
                              <TableCell className="text-center">
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30 w-full sm:w-auto text-xs" onClick={() => handleBaixarNF(grp, 'cupom')} title="Cupom da Impressora de Caixa">
                                    <Printer className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> <span className="hidden sm:inline">Cupom</span>
                                  </Button>
 
                                  <Button variant="outline" size="sm" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30 w-full sm:w-auto text-xs" onClick={() => handleBaixarNF(grp, 'danfe')} title="Nota Fiscal Formal A4">
                                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> <span className="hidden sm:inline">DANFE</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
 
        <TabsContent value="xml">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2 border-dashed border-border bg-muted/30 w-full">
              <CardHeader>
                <CardTitle>Enviar Documento</CardTitle>
                <CardDescription>Arraste o arquivo XML da Nota Fiscal</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6 sm:py-10">
                {!file ? (
                  <div className="w-full flex flex-col items-center cursor-pointer p-4 sm:p-8 text-center" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 sm:mb-6"><UploadCloud className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" /></div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">Toque ou arraste o seu XML</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">Apenas ficheiros terminados em .xml</p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 sm:mb-6"><FileCode className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" /></div>
                    <h3 className="text-sm sm:text-lg font-semibold text-foreground max-w-[200px] sm:max-w-full truncate px-4">{file.name}</h3>
                    <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8 w-full px-4 sm:px-8">
                      <Button variant="outline" className="flex-1 text-red-600 dark:text-red-400 w-full" onClick={limparImportacaoXml} disabled={loadingXml}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remover
                      </Button>
                      <Button className="flex-1 w-full" onClick={handleProcessarXML} disabled={loadingXml || !!relatorioImportacao}>
                        {loadingXml ? "A processar e salvar..." : relatorioImportacao ? "Já importado" : "Ler e Salvar no Estoque"}
                      </Button>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-3 text-center px-4">
                      Ao confirmar, o sistema já extrai e grava os produtos/lotes direto no seu estoque — não há uma etapa
                      de conferência antes de salvar.
                    </p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept=".xml, text/xml, application/xml" onChange={handleFileInput} />
              </CardContent>
            </Card>
 
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg"><Info className="h-5 w-5" /> Dica para o Gestor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-amber-900 dark:text-amber-200/80 text-justify">
                <p className="text-sm sm:text-base"><strong>Por que usar o XML e não o PDF?</strong></p>
                <p className="text-xs sm:text-sm">O arquivo XML é o padrão oficial da Receita Federal (SEFAZ). O XML contém os dados de forma <strong>100% estruturada e exata</strong>.</p>
                <p className="text-xs sm:text-sm">Ao usar o XML, o sistema garante precisão absoluta na extração de nomes, códigos de barras e preços de custo.</p>
              </CardContent>
            </Card>
          </div>
 
          {relatorioImportacao && (
            <Card className="mt-6 border-green-500/20 shadow-md w-full overflow-hidden bg-card">
              <CardHeader className="bg-green-500/5 border-b border-green-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-lg sm:text-xl"><CheckCircle className="h-5 w-5" /> Importado com Sucesso</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Relatório devolvido pelo servidor após salvar no estoque.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={limparImportacaoXml} className="w-full sm:w-auto">Importar outro arquivo</Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-1.5">
                  {relatorioImportacao.split('\n').filter((l) => l.trim() !== '').map((linha, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground">{linha}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
 
      <Dialog open={modalPerdaAberto} onOpenChange={setModalPerdaAberto}>
        <DialogContent className="sm:max-w-md w-[95%] mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 dark:text-red-500 text-lg sm:text-xl"><AlertTriangle className="w-5 h-5 mr-2" /> Quebra/Perda</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-justify mt-2">
              Os {totalItens} produtos que estão no carrinho serão abatidos do stock como perda/quebra.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 sm:py-4">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 font-medium">Motivo da Perda (Obrigatório)</p>
            <Input
              placeholder="Ex: Produto passou da validade..."
              value={motivoPerda}
              onChange={(e) => setMotivoPerda(e.target.value)}
              className="h-10 sm:h-12 w-full text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setModalPerdaAberto(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleRegistrarPerda} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
 



