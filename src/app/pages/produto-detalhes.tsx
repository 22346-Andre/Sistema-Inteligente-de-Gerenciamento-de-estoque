import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Package, ShoppingCart, Edit, FileText, AlertTriangle, ArrowRightLeft, Scale, Clock, Plus, Trash2, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import { toast } from 'sonner';
import { produtoService } from '../services/produto.service';

const formatBRL = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export default function ProdutoDetalhes() {
  const { id } = useParams();
  const [produto, setProduto] = useState<any>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogEditOpen, setDialogEditOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any>(null);

  const [dialogPerdaOpen, setDialogPerdaOpen] = useState(false);
  const [perdaQuantidade, setPerdaQuantidade] = useState<string>('');
  const [perdaMotivo, setPerdaMotivo] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const resProduto = await api.get(`/produtos/${id}`);
      setProduto(resProduto.data);
      try {
        const resMov = await api.get(`/movimentacoes/produto/${id}`);
        setMovimentacoes(resMov.data);
      } catch (e) {
        console.log("Histórico vazio assumido.");
      }
    } catch (error) {
      toast.error("Erro ao carregar os detalhes do produto.");
    } finally {
      setLoading(false);
    }
  };

  const adicionarLinhaImpostoEdit = () => {
    if (!produtoEditando) return;
    setProdutoEditando({
      ...produtoEditando,
      impostos: [...(produtoEditando.impostos || []), { sigla: '', esfera: 'Estadual', aliquota: '' }]
    });
  };

  const atualizarImpostoEdit = (index: number, campo: string, valor: any) => {
    if (!produtoEditando) return;
    const novaLista = [...(produtoEditando.impostos || [])];
    novaLista[index] = { ...novaLista[index], [campo]: valor };
    setProdutoEditando({ ...produtoEditando, impostos: novaLista });
  };

  const removerImpostoEdit = (index: number) => {
    if (!produtoEditando) return;
    const novaLista = (produtoEditando.impostos || []).filter((_: any, i: number) => i !== index);
    setProdutoEditando({ ...produtoEditando, impostos: novaLista });
  };

  const handleSalvarEdicao = async () => {
    try {
      const dadosParaEnviar = {
        ...produtoEditando,
        precoCusto: Number(produtoEditando.precoCusto) || 0,
        precoVenda: Number(produtoEditando.precoVenda) || 0,
        quantidadeMinima: Number(produtoEditando.estoqueMinimo || produtoEditando.quantidadeMinima) || 0,
        estoqueMinimo: Number(produtoEditando.estoqueMinimo || produtoEditando.quantidadeMinima) || 0,
        impostos: (produtoEditando.impostos || []).map((imp: any) => ({
            ...imp, aliquota: Number(imp.aliquota) || 0
        }))
      };

      const response = await api.put(`/produtos/${id}`, dadosParaEnviar);
      setProduto(response.data);
      setDialogEditOpen(false);
      toast.success('Produto atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao editar produto.');
    }
  };

  const handleRegistrarPerda = async () => {
    const qtd = Number(perdaQuantidade);
    if (!qtd || qtd <= 0) {
      toast.error('Informe uma quantidade válida superior a zero.');
      return;
    }
    if (qtd > produto.quantidade) {
      toast.error(`Você não pode relatar uma perda maior que o estoque atual (${produto.quantidade}).`);
      return;
    }
    if (!perdaMotivo.trim()) {
      toast.error('Por favor, informe o motivo da perda (ex: Vencimento, Avaria).');
      return;
    }

    try {
      await produtoService.registrarSaida(Number(id), {
        quantidadeDesejada: qtd,
        tipo: 'QUEBRA_PERDA',
        motivo: perdaMotivo
      });

      toast.success('Quebra/Perda registada com sucesso!');
      setDialogPerdaOpen(false);
      setPerdaQuantidade('');
      setPerdaMotivo('');

      carregarDados();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registar perda.');
    }
  };

  const handleBaixarNF = async (movId: number) => {
    try {
      toast.loading("A gerar Documento Fiscal...", { id: 'nf' });
      const response = await api.get(`/relatorios/danfe/${movId}/pdf`, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NF_Operacao_${movId}.pdf`);
      document.body.appendChild(link);
      link.click();

      toast.success("Documento baixado com sucesso!", { id: 'nf' });
    } catch (error) {
      toast.error("Erro ao gerar a Nota Fiscal.", { id: 'nf' });
    }
  };

  const handleChangeGenerico = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.includes('-')) return;

    if (val === '') {
        setProdutoEditando({ ...produtoEditando, [field]: '' });
        return;
    }

    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
        setProdutoEditando({ ...produtoEditando, [field]: val.replace(/^0+(?=\d)/, '') });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!produto) {
    return (
      <div className="text-center py-12 text-foreground">
        <p className="text-muted-foreground">Produto não encontrado no Banco de Dados</p>
        <Link to="/produtos"><Button className="mt-4">Voltar para Produtos</Button></Link>
      </div>
    );
  }

  const precoCusto = produto.precoCusto || 0;
  const precoVenda = produto.precoVenda || 0;
  const quantidade = produto.quantidade || 0;
  const estoqueMinimo = produto.estoqueMinimo ?? produto.quantidadeMinima ?? 0;
  const estoqueBaixo = quantidade < estoqueMinimo;
  const valorTotalEstoque = quantidade * precoCusto;

  // Se não há custo cadastrado, "margem" não tem um número honesto pra mostrar
  // (não é 100% — é indefinido, porque não sabemos quanto esse produto custou).
  // E quando o custo é MAIOR que o preço de venda, a margem é negativa de
  // verdade — o produto dá prejuízo a cada venda, e isso precisa aparecer em
  // vermelho, não em verde como se fosse uma boa notícia.
  const margemDefinida = precoCusto > 0;
  const margemLucroNum = margemDefinida ? ((precoVenda - precoCusto) / precoCusto) * 100 : null;
  const margemNegativa = margemLucroNum !== null && margemLucroNum < 0;

  const renderBadgeMovimentacao = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA': return <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded text-xs font-bold">ENTRADA</span>;
      case 'SAIDA': return <span className="bg-blue-500/20 text-blue-600 px-2 py-1 rounded text-xs font-bold">SAÍDA</span>;
      case 'DEVOLUCAO': return <span className="bg-purple-500/20 text-purple-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><ArrowRightLeft className="w-3 h-3"/> DEVOLUÇÃO</span>;
      case 'QUEBRA_PERDA': return <span className="bg-destructive/20 text-destructive px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3"/> PERDA</span>;
      case 'AJUSTE_INVENTARIO': return <span className="bg-orange-500/20 text-orange-600 px-2 py-1 rounded text-xs font-bold">AJUSTE</span>;
      default: return <span>{tipo}</span>;
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/produtos"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 flex-wrap">
              {produto.nome}
              {produto.finalidadeEstoque === 'USO_INTERNO' && <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md uppercase">Uso Interno</span>}
              {estoqueBaixo && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-md uppercase flex items-center gap-1 border border-destructive/20">
                  <AlertTriangle className="h-3 w-3" /> Estoque Baixo
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">Detalhes do Estoque</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setDialogPerdaOpen(true)} className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Registar Perda
          </Button>

          <Button onClick={() => {
              setProdutoEditando({
                  ...produto,
                  precoCusto: produto.precoCusto === 0 ? '' : produto.precoCusto.toString(),
                  precoVenda: produto.precoVenda === 0 ? '' : produto.precoVenda.toString(),
                  estoqueMinimo: (produto.estoqueMinimo || produto.quantidadeMinima) === 0 ? '' : (produto.estoqueMinimo || produto.quantidadeMinima).toString(),
                  impostos: produto.impostos || []
              });
              setDialogEditOpen(true);
            }} className="gap-2">
            <Edit className="h-4 w-4" /> Editar Produto
          </Button>
        </div>
      </div>

      {estoqueBaixo && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Estoque atual ({quantidade}) está abaixo do mínimo configurado ({estoqueMinimo}). Considere repor.
        </div>
      )}

      <Dialog open={dialogPerdaOpen} onOpenChange={setDialogPerdaOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Registar Quebra / Perda
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/20">
              Esta ação irá abater os itens do seu stock atual (Saldo: <strong>{produto.quantidade}</strong>) e enviará o custo para o relatório de perdas financeiras.
            </div>
            <div className="space-y-2">
              <Label>Quantidade Perdida</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 2"
                value={perdaQuantidade}
                onChange={e => {
                  const val = e.target.value;
                  if (val.includes('-')) return;
                  if(val === '') setPerdaQuantidade('');
                  else if(Number(val) > 0) setPerdaQuantidade(val);
                }}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo (Avaria, Validade, Furto, etc.)</Label>
              <Input
                placeholder="Ex: Produto rasgou na prateleira"
                value={perdaMotivo}
                onChange={e => setPerdaMotivo(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPerdaOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRegistrarPerda}>Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogEditOpen} onOpenChange={setDialogEditOpen}>
        <DialogContent className="max-w-2xl bg-card text-card-foreground border-border">
          <DialogHeader><DialogTitle>Editar Informações</DialogTitle></DialogHeader>
          {produtoEditando && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2"><Label>Nome do Produto</Label><Input className="bg-background" value={produtoEditando.nome} onChange={e => setProdutoEditando({...produtoEditando, nome: e.target.value})} /></div>
              <div className="space-y-2"><Label>Categoria</Label><Input className="bg-background" value={produtoEditando.categoria || ''} onChange={e => setProdutoEditando({...produtoEditando, categoria: e.target.value})} /></div>
              <div className="space-y-2"><Label>Código de Barras</Label><Input className="bg-background" value={produtoEditando.codigoBarras || ''} onChange={e => setProdutoEditando({...produtoEditando, codigoBarras: e.target.value})} /></div>

              <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                      className="bg-background"
                      type="number" step="0.01" min="0"
                      value={produtoEditando.precoCusto}
                      onChange={e => handleChangeGenerico('precoCusto', e)}
                  />
              </div>
              <div className="space-y-2">
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                      className="bg-background"
                      type="number" step="0.01" min="0"
                      value={produtoEditando.precoVenda}
                      onChange={e => handleChangeGenerico('precoVenda', e)}
                  />
              </div>
              {Number(produtoEditando.precoCusto) > 0 && Number(produtoEditando.precoVenda) > 0 &&
                Number(produtoEditando.precoCusto) > Number(produtoEditando.precoVenda) && (
                <p className="text-xs text-destructive col-span-2 -mt-2 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Custo maior que o preço de venda — margem negativa.
                </p>
              )}
              <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input
                      className="bg-background"
                      type="number" min="0"
                      value={produtoEditando.estoqueMinimo}
                      onChange={e => {
                          handleChangeGenerico('estoqueMinimo', e);
                          handleChangeGenerico('quantidadeMinima', e);
                      }}
                  />
              </div>
              <div className="space-y-2"></div>

              <div className="space-y-2"><Label>NCM</Label><Input className="bg-background" value={produtoEditando.ncm || ''} onChange={e => setProdutoEditando({...produtoEditando, ncm: e.target.value})} /></div>
              <div className="space-y-2"><Label>CFOP</Label><Input className="bg-background" value={produtoEditando.cfop || ''} onChange={e => setProdutoEditando({...produtoEditando, cfop: e.target.value})} /></div>

              <div className="col-span-2 pt-4 border-t border-border mt-2">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-foreground font-semibold">Impostos Associados</Label>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarLinhaImpostoEdit}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Imposto
                  </Button>
                </div>

                {(produtoEditando.impostos || []).map((imposto: any, index: number) => (
                  <div key={index} className="flex gap-2 items-center mt-2">
                    <Input placeholder="Sigla (Ex: ICMS)" className="w-1/3 bg-background" value={imposto.sigla} onChange={e => atualizarImpostoEdit(index, 'sigla', e.target.value)} />
                    <select className="w-1/3 px-3 py-2 border border-input rounded-md bg-background text-foreground" value={imposto.esfera} onChange={e => atualizarImpostoEdit(index, 'esfera', e.target.value)}>
                      <option value="Estadual">Estadual</option>
                      <option value="Federal">Federal</option>
                      <option value="Municipal">Municipal</option>
                    </select>
                    <div className="relative w-1/3">
                      <Input className="bg-background" type="number" min="0" placeholder="Alíquota" value={imposto.aliquota} onChange={e => {
                          if (e.target.value.includes('-')) return;
                          atualizarImpostoEdit(index, 'aliquota', e.target.value);
                      }} />
                      <span className="absolute right-3 top-2 text-muted-foreground">%</span>
                    </div>
                    <Button type="button" variant="ghost" className="text-red-500 p-2 hover:bg-red-500/10" onClick={() => removerImpostoEdit(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(produtoEditando.impostos?.length === 0) && <p className="text-xs text-muted-foreground italic">Nenhum imposto associado.</p>}
              </div>

            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogEditOpen(false)}>Cancelar</Button><Button onClick={handleSalvarEdicao}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-4 bg-muted text-muted-foreground border-border">
          <TabsTrigger value="geral" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"><Package className="h-4 w-4"/> Visão Geral</TabsTrigger>
          <TabsTrigger value="fiscal" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"><Scale className="h-4 w-4"/> Fiscal e Tributos</TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"><Clock className="h-4 w-4"/> Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border shadow-sm">
              <CardHeader><CardTitle>Informações de Estoque</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div><p className="text-sm text-muted-foreground mb-1">Código de Barras</p><p className="font-mono text-lg bg-muted text-foreground p-2 rounded-md border border-border inline-block">{produto.codigoBarras || 'Sem Código'}</p></div>
                    <div><p className="text-sm text-muted-foreground mb-1">Categoria</p><p className="font-medium">{produto.categoria || 'Sem Categoria'}</p></div>
                    <div><p className="text-sm text-muted-foreground mb-1">Fornecedor Principal</p><p className="font-medium text-primary">{produto.fornecedor?.nome || 'Nenhum fornecedor vinculado'}</p></div>
                  </div>
                  <div className="space-y-5">
                    <div className={`p-4 rounded-xl border ${estoqueBaixo ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'}`}>
                      <p className={`text-sm font-semibold mb-1 ${estoqueBaixo ? 'text-destructive' : 'text-primary'}`}>Quantidade Atual</p>
                      <p className={`text-4xl font-black ${estoqueBaixo ? 'text-destructive' : 'text-primary'}`}>{quantidade} <span className="text-base font-medium">{produto.unidade || 'UN'}</span></p>
                    </div>
                    <div className="flex gap-6">
                      <div><p className="text-sm text-muted-foreground mb-1">Estoque Mínimo</p><p className="text-xl font-bold text-foreground">{estoqueMinimo}</p></div>
                      <div><p className="text-sm text-muted-foreground mb-1">Preço Venda</p><p className="text-xl font-bold text-green-500">{formatBRL(precoVenda)}</p></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-card border-border shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custo Médio Ponderado</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatBRL(precoCusto)}</div><p className="text-xs text-muted-foreground mt-1">Baseado nas compras</p></CardContent></Card>
              <Card className="bg-card border-border shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Valor Imobilizado (Estoque)</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatBRL(valorTotalEstoque)}</div></CardContent></Card>
              <Card className={`bg-card border-border shadow-sm ${margemNegativa ? 'border-destructive/30' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
                  {margemNegativa
                    ? <TrendingDown className="h-4 w-4 text-destructive" />
                    : <ShoppingCart className="h-4 w-4 text-green-500" />}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${!margemDefinida ? 'text-muted-foreground' : margemNegativa ? 'text-destructive' : 'text-green-500'}`}>
                    {margemDefinida ? `${margemLucroNum!.toFixed(1)}%` : '—'}
                  </div>
                  {!margemDefinida && <p className="text-xs text-muted-foreground mt-1">Cadastre o preço de custo para calcular</p>}
                  {margemNegativa && <p className="text-xs text-destructive mt-1">Vendendo abaixo do custo</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fiscal">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-muted-foreground"/> Perfil Tributário do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-muted p-5 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">NCM (Nomenclatura Comum)</p>
                  <p className="font-mono text-xl text-foreground">{produto.ncm || 'Não informado'}</p>
                </div>
                <div className="bg-muted p-5 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">CFOP Padrão</p>
                  <p className="font-mono text-xl text-foreground">{produto.cfop || 'Não informado'}</p>
                </div>
                <div className="bg-muted p-5 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Finalidade</p>
                  <p className="text-xl font-medium text-foreground">{produto.finalidadeEstoque || 'REVENDA'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4 border-b border-border pb-2 text-foreground">Impostos Associados</h4>
                {(!produto.impostos || produto.impostos.length === 0) ? (
                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-4 rounded-md">
                    <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Atenção: Produto Isento ou Sem Tributação Cadastrada</p>
                    <p className="text-sm mt-1 opacity-90">Se este produto for tributado, clique em "Editar Produto" para associar o ICMS, IPI, PIS ou COFINS.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imposto</TableHead>
                        <TableHead>Esfera</TableHead>
                        <TableHead className="text-right">Alíquota (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produto.impostos.map((imp: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-foreground">{imp.sigla}</TableCell>
                          <TableCell className="text-muted-foreground">{imp.esfera}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{Number(imp.aliquota ?? 0).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader><CardTitle>Registro de Movimentações (Auditoria)</CardTitle></CardHeader>
            <CardContent>
              {movimentacoes.length === 0 ? <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg border border-border">O histórico de movimentações está vazio.</div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo / Observação</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map(mov => (
                      <TableRow key={mov.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="whitespace-nowrap text-foreground">{format(new Date(mov.dataMovimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>{renderBadgeMovimentacao(mov.tipo)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate" title={mov.motivo || mov.observacao}>
                          {mov.motivo || mov.observacao || '-'}
                        </TableCell>
                        <TableCell className="font-bold text-right text-foreground">{mov.quantidade}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBaixarNF(mov.id)}
                            title="Baixar Comprovante Fiscal"
                            className="hover:bg-primary/10"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}