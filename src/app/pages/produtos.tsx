import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Plus, Search, Edit, Trash2, AlertCircle, PackageSearch, Boxes, TriangleAlert, Wallet } from 'lucide-react';
import { produtoService, Produto, ProdutoDTO, Imposto } from '../services/produto.service';
import { fornecedorService, Fornecedor } from '../services/fornecedor.service';
import { dashboardService } from '../services/dashboard.service';
import { toast } from 'sonner';
import api from '../services/api';

const formatBRL = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// A API devolve o estoque mínimo do produto como "estoqueMinimo" (é assim que a
// entidade Produto chama o campo lá no backend). O DTO de ENVIO (criar/editar)
// usa "quantidadeMinima" — são objetos diferentes, com nomes diferentes de
// propósito. Esse helper cobre os dois pra não depender de qual endpoint
// preencheu o objeto.
const getEstoqueMinimo = (produto: Produto): number =>
  (produto as any).estoqueMinimo ?? (produto as any).quantidadeMinima ?? 0;

const BADGE_ABC: Record<string, string> = {
  A: 'bg-green-500/20 text-green-500 border-green-500/20',
  B: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20',
  C: 'bg-destructive/20 text-destructive border-destructive/20',
};

export default function Produtos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [searchParams] = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get('q') || '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const estadoInicialProduto = {
    nome: '',
    codigoBarras: '',
    quantidadeMinima: '',
    quantidade: '',
    precoVenda: '',
    precoCusto: '',
    categoria: '',
    fornecedorId: 0,
    ncm: '',
    cfop: '',
    finalidadeEstoque: 'REVENDA',
    impostos: [] as Imposto[]
  };

  const [novoProduto, setNovoProduto] = useState<any>(estadoInicialProduto);

  const TAMANHO_PAGINA = 25;
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalElementos, setTotalElementos] = useState(0);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [buscaDebounced, setBuscaDebounced] = useState(busca);

  
  const [resumoGeral, setResumoGeral] = useState({ totalProdutos: 0, produtosCriticos: 0, valorEmEstoque: 0 });

 
  const [classificacaoAbcPorProduto, setClassificacaoAbcPorProduto] = useState<Record<number, string>>({});

  // Debounce da busca: espera 400ms sem digitar antes de consultar o backend,
  // pra não disparar uma requisição a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    const queryVoz = searchParams.get('q');
    if (queryVoz !== null) {
      setBusca(queryVoz);
    }
  }, [searchParams]);

  useEffect(() => {
    carregarProdutosPagina();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, buscaDebounced]);

  useEffect(() => {
    carregarDadosAuxiliares();
  }, []);

  const carregarProdutosPagina = async () => {
    try {
      setCarregandoProdutos(true);
      const resultado = await produtoService.listarPaginado(pagina, TAMANHO_PAGINA, buscaDebounced);
      setProdutos(resultado.content);
      setTotalPaginas(resultado.totalPages);
      setTotalElementos(resultado.totalElements);
    } catch (error) {
      toast.error('Erro ao carregar produtos. Verifique se o servidor está rodando.');
    } finally {
      setCarregandoProdutos(false);
      setLoading(false);
    }
  };

  // Fornecedores (pro formulário) + resumo geral (cards do topo) + badges de ABC
  // — tudo independente da paginação da tabela, carregado uma vez só.
  const carregarDadosAuxiliares = async () => {
    try {
      const fornecedoresData = await fornecedorService.listarTodos();
      setFornecedores(fornecedoresData);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores.');
    }

    try {
      const resumo = await dashboardService.obterResumoGeral();
      setResumoGeral({
        totalProdutos: resumo.totalProdutos,
        produtosCriticos: resumo.produtosCriticos,
        valorEmEstoque: resumo.valorEmEstoque,
      });
    } catch (error) {
      // silencioso — cards do topo simplesmente não populam, tabela continua ok
    }

    try {
      const curvaAbc = await dashboardService.obterCurvaABC('faturamento', 90);
      const mapa: Record<number, string> = {};
      curvaAbc.forEach((item) => { mapa[item.produtoId] = item.classe; });
      setClassificacaoAbcPorProduto(mapa);
    } catch (error) {
      // silencioso — perfil CAIXA não tem acesso, tabela só não mostra os badges
    }
  };

  // Recarrega tudo que pode ter mudado depois de criar/editar/excluir um produto.
  const recarregarTudo = () => {
    carregarProdutosPagina();
    carregarDadosAuxiliares();
  };

  const adicionarLinhaImpostoNovo = () => {
    setNovoProduto({
      ...novoProduto,
      impostos: [...(novoProduto.impostos || []), { sigla: '', esfera: 'Estadual', aliquota: '' }]
    });
  };

  const atualizarImpostoNovo = (index: number, campo: string, valor: any) => {
    const novaLista = [...(novoProduto.impostos || [])];
    novaLista[index] = { ...novaLista[index], [campo]: valor };
    setNovoProduto({ ...novoProduto, impostos: novaLista });
  };

  const removerImpostoNovo = (index: number) => {
    const novaLista = (novoProduto.impostos || []).filter((_imposto: Imposto, i: number) => i !== index);
    setNovoProduto({ ...novoProduto, impostos: novaLista });
  };

  const handleAdicionarProduto = async () => {
    if (novoProduto.fornecedorId === 0 && fornecedores.length > 0) {
      toast.error('Por favor, selecione um Fornecedor!');
      return;
    }

    try {
      const dadosTratados = {
        ...novoProduto,
        quantidade: Math.max(0, Number(novoProduto.quantidade) || 0),
        quantidadeMinima: Math.max(0, Number(novoProduto.quantidadeMinima) || 0),
        precoCusto: Math.max(0, Number(novoProduto.precoCusto) || 0),
        precoVenda: Math.max(0, Number(novoProduto.precoVenda) || 0),
        impostos: (novoProduto.impostos || []).map((imp: any) => ({
            ...imp, aliquota: Math.max(0, Number(imp.aliquota) || 0)
        }))
      };

      await produtoService.criar(dadosTratados);
      toast.success('Produto adicionado com sucesso!');
      setDialogOpen(false);
      setNovoProduto({ ...estadoInicialProduto, fornecedorId: fornecedores.length > 0 ? fornecedores[0].id : 0 });
      setPagina(0);
      recarregarTudo();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || error.response?.data?.message || 'Erro ao adicionar produto');
    }
  };

  const handleExcluirProduto = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await produtoService.deletar(id);
      toast.success('Produto excluído com sucesso!');
      // Se essa era a última linha da página (e não a primeira página), volta
      // uma página em vez de mostrar uma tabela vazia.
      if (produtos.length === 1 && pagina > 0) {
        setPagina((p) => p - 1);
      } else {
        recarregarTudo();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao excluir produto. Verifique se não há movimentações vinculadas.');
    }
  };

  // 🟢 CORRIGIDO: busca agora é feita no backend (via buscaDebounced em
  // carregarProdutosPagina), não filtrando um array já carregado inteiro em
  // memória — "produtos" já vem só com os itens da página atual.

  // Blindagem contra números negativos
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any>>, field: string) => {
    let val = e.target.value.replace(/-/g, '');
    if (val === '') {
        setter((prev: any) => ({ ...prev, [field]: '' }));
        return;
    }
    const num = Number(val);
    if (!isNaN(num)) {
        setter((prev: any) => ({ ...prev, [field]: val.replace(/^0+(?=\d)/, '') }));
    }
  };

  const preventInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">Gerencie todos os seus produtos e tributações</p>
        </div>

        {/* --- MODAL DE CRIAR PRODUTO --- */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Produto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">

              <div className="bg-muted p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-foreground border-b border-border pb-2">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome</Label><Input className="bg-background" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Cód. Barras</Label><Input className="bg-background" value={novoProduto.codigoBarras} onChange={e => setNovoProduto({...novoProduto, codigoBarras: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoria</Label><Input className="bg-background" value={novoProduto.categoria} onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={novoProduto.fornecedorId} onChange={e => setNovoProduto({...novoProduto, fornecedorId: Number(e.target.value)})}>
                      <option value={0}>Selecione um fornecedor</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-foreground border-b border-border pb-2">Estoque e Preços</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                      <Label>Qtd Inicial</Label>
                      <Input className="bg-background" type="number" min="0" onKeyDown={preventInvalidKeys} value={novoProduto.quantidade} onChange={e => handleNumberInput(e, setNovoProduto, 'quantidade')} />
                  </div>
                  <div className="space-y-2">
                      <Label>Qtd Mínima</Label>
                      <Input className="bg-background" type="number" min="0" onKeyDown={preventInvalidKeys} value={novoProduto.quantidadeMinima} onChange={e => handleNumberInput(e, setNovoProduto, 'quantidadeMinima')} />
                  </div>
                  <div className="space-y-2">
                      <Label>Custo (R$)</Label>
                      <Input className="bg-background" type="number" min="0" step="0.01" onKeyDown={preventInvalidKeys} value={novoProduto.precoCusto} onChange={e => handleNumberInput(e, setNovoProduto, 'precoCusto')} />
                  </div>
                  <div className="space-y-2">
                      <Label>Venda (R$)</Label>
                      <Input className="bg-background" type="number" min="0" step="0.01" onKeyDown={preventInvalidKeys} value={novoProduto.precoVenda} onChange={e => handleNumberInput(e, setNovoProduto, 'precoVenda')} />
                  </div>
                </div>
                {Number(novoProduto.precoVenda) > 0 && Number(novoProduto.precoCusto) > Number(novoProduto.precoVenda) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <TriangleAlert className="h-3 w-3" /> O preço de custo está maior que o de venda — esse produto vai dar prejuízo a cada unidade vendida.
                  </p>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-4 border border-border">
                <h3 className="font-semibold text-foreground border-b border-border pb-2">Dados Fiscais e Tributação</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Finalidade do Estoque</Label>
                    <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={novoProduto.finalidadeEstoque} onChange={e => setNovoProduto({ ...novoProduto, finalidadeEstoque: e.target.value })}>
                      <option value="REVENDA">Revenda</option>
                      <option value="USO_INTERNO">Uso Interno</option>
                      <option value="MATERIA_PRIMA">Matéria-Prima</option>
                    </select>
                  </div>
                  <div className="space-y-2"><Label>NCM</Label><Input className="bg-background" placeholder="Ex: 84713012" value={novoProduto.ncm || ''} onChange={e => setNovoProduto({ ...novoProduto, ncm: e.target.value })} /></div>
                  <div className="space-y-2"><Label>CFOP</Label><Input className="bg-background" placeholder="Ex: 5102" value={novoProduto.cfop || ''} onChange={e => setNovoProduto({ ...novoProduto, cfop: e.target.value })} /></div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Impostos Aplicáveis</Label>
                    <Button type="button" variant="outline" size="sm" onClick={adicionarLinhaImpostoNovo}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Imposto
                    </Button>
                  </div>

                  {(novoProduto.impostos || []).map((imposto: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center mt-2">
                      <Input placeholder="Sigla (Ex: ICMS)" className="w-1/3 bg-background" value={imposto.sigla} onChange={e => atualizarImpostoNovo(index, 'sigla', e.target.value)} />
                      <select className="w-1/3 px-3 py-2 border border-input rounded-md bg-background text-foreground" value={imposto.esfera} onChange={e => atualizarImpostoNovo(index, 'esfera', e.target.value)}>
                        <option value="Estadual">Estadual</option>
                        <option value="Federal">Federal</option>
                        <option value="Municipal">Municipal</option>
                      </select>
                      <div className="relative w-1/3">
                        <Input className="bg-background" type="number" min="0" placeholder="Alíquota" value={imposto.aliquota} onKeyDown={preventInvalidKeys} onChange={e => {
                            let val = e.target.value.replace(/-/g, '');
                            atualizarImpostoNovo(index, 'aliquota', val);
                        }} />
                        <span className="absolute right-3 top-2 text-muted-foreground">%</span>
                      </div>
                      <Button type="button" variant="ghost" className="text-red-500 p-2 hover:bg-red-500/10" onClick={() => removerImpostoNovo(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(novoProduto.impostos?.length === 0) && <p className="text-xs text-muted-foreground italic">Produto isento (nenhum imposto cadastrado).</p>}
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAdicionarProduto}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Boxes className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{resumoGeral.totalProdutos}</p>
              <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-card border-border shadow-sm ${resumoGeral.produtosCriticos > 0 ? 'border-destructive/30' : ''}`}>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><TriangleAlert className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className={`text-2xl font-bold ${resumoGeral.produtosCriticos > 0 ? 'text-destructive' : 'text-foreground'}`}>{resumoGeral.produtosCriticos}</p>
              <p className="text-xs text-muted-foreground">Com estoque abaixo do mínimo</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Wallet className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatBRL(resumoGeral.valorEmEstoque)}</p>
              <p className="text-xs text-muted-foreground">Valor total em estoque (custo)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código de barras..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10 bg-background text-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código de Barras</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Curva ABC</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => {
                  const estoqueMinimo = getEstoqueMinimo(produto);
                  const estoqueBaixo = (produto.quantidade || 0) < estoqueMinimo;
                  return (
                    <TableRow key={produto.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2" title={estoqueBaixo ? `Estoque abaixo do mínimo! (mín: ${estoqueMinimo})` : undefined}>
                          {estoqueBaixo && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                          <Link to={`/produtos/${produto.id}`} className="font-medium text-foreground hover:underline">
                            {produto.nome}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{produto.codigoBarras || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{produto.categoria || '-'}</TableCell>

                      <TableCell className="text-center">
                        {classificacaoAbcPorProduto[produto.id] && BADGE_ABC[classificacaoAbcPorProduto[produto.id]] ? (
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${BADGE_ABC[classificacaoAbcPorProduto[produto.id]]}`}>
                            Classe {classificacaoAbcPorProduto[produto.id]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Sem venda no período</span>
                        )}
                      </TableCell>

                      <TableCell className={`text-right ${estoqueBaixo ? 'text-destructive font-bold' : 'text-foreground'}`}>{produto.quantidade || 0}</TableCell>
                      <TableCell className="text-right text-foreground">{formatBRL(produto.precoVenda || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                             size="sm"
                             variant="outline"
                             className="hover:bg-accent"
                             onClick={() => navigate(`/produtos/${produto.id}`)}
                          >
                            <Edit className="h-4 w-4 text-foreground" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => handleExcluirProduto(produto.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {carregandoProdutos && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Carregando produtos...
            </div>
          )}
          {produtos.length === 0 && !loading && !carregandoProdutos && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <PackageSearch className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum produto encontrado.</p>
            </div>
          )}

         
          {totalPaginas > 1 && !carregandoProdutos && (
            <div className="flex items-center justify-between px-2 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Página {pagina + 1} de {totalPaginas} · {totalElementos} produto{totalElementos !== 1 ? 's' : ''} no total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}