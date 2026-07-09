import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileText, Download, BarChart3, Package, AlertTriangle, Calendar, 
  TrendingUp, Layers, Eye, EyeOff 
} from 'lucide-react';
import { relatorioService } from '../services/relatorio.service';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  icone: any;
  tipo: string;
  cor: 'blue' | 'purple' | 'red' | 'green' | 'orange' | 'cyan';
  metodo: (inicio?: string, fim?: string) => Promise<void>;
}

interface ProdutoMovimentado {
  nome: string;
  quantidade: number;
}

interface EstoqueCategoria {
  categoria: string;
  quantidade: number;
}

const CORES_GRAFICO = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#06b6d4'];

export default function Relatorios() {
  const [gerando, setGerando] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [abaDados, setAbaDados] = useState<'relatorios' | 'graficos'>('relatorios');
  const [mostrarGraficos, setMostrarGraficos] = useState(true);

  // Estados para dados dos gráficos (Vindos da API)
  const [produtosMovimentados, setProdutosMovimentados] = useState<ProdutoMovimentado[]>([]);
  const [estoqueCategoria, setEstoqueCategoria] = useState<EstoqueCategoria[]>([]);
  const [carregandoGraficos, setCarregandoGraficos] = useState(false);

  const relatorios: Relatorio[] = [
    {
      id: '1',
      titulo: 'Relatório de Balanço Geral',
      descricao: 'Lista completa com todos os produtos, quantidades e valores atuais.',
      icone: Package,
      tipo: 'balanco',
      cor: 'blue',
      metodo: (inicio, fim) => relatorioService.downloadBalancoPdf(inicio, fim)
    },
    {
      id: '2',
      titulo: 'Histórico de Movimentações',
      descricao: 'Todas as entradas e saídas de estoque do período selecionado.',
      icone: FileText,
      tipo: 'movimentacoes',
      cor: 'green',
      metodo: (inicio, fim) => relatorioService.downloadMovimentacoesPdf(inicio, fim)
    },
    {
      id: '3',
      titulo: 'Inventário Fiscal',
      descricao: 'Relatório completo para prestação de contas e auditorias fiscais.',
      icone: BarChart3,
      tipo: 'inventario',
      cor: 'purple',
      metodo: (inicio, fim) => relatorioService.downloadInventarioPdf(inicio, fim)
    },
    {
      id: '4',
      titulo: 'Análise de Quebras e Perdas',
      descricao: 'Identifique custos invisíveis gerados por avarias e vencimentos.',
      icone: AlertTriangle,
      tipo: 'perdas',
      cor: 'red',
      metodo: (inicio, fim) => relatorioService.downloadPerdasPdf(inicio, fim)
    },
    {
      id: '5',
      titulo: 'Produtos Mais Movimentados',
      descricao: 'Ranking dos produtos com maior volume de movimentações.',
      icone: TrendingUp,
      tipo: 'movimentados',
      cor: 'orange',
      metodo: (inicio, fim) => relatorioService.downloadProdutosMaisMovimentadosPdf(inicio, fim)
    },
    {
      id: '6',
      titulo: 'Estoque por Categoria',
      descricao: 'Distribuição do estoque total por categoria de produto.',
      icone: Layers,
      tipo: 'categoria',
      cor: 'cyan',
      metodo: (inicio, fim) => relatorioService.downloadEstoqueCategoriaPdf(inicio, fim)
    }
  ];

  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return true;
    const date = new Date(dateString);
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;
    const year = date.getFullYear();
    return year >= 2000 && year <= 2099;
  };

  const isDateRangeValid = (inicio: string, fim: string): boolean => {
    if (!inicio || !fim) return true;
    return new Date(inicio) <= new Date(fim);
  };

  // Carregar dados dos gráficos sempre que a aba for 'graficos' ou o usuário mandar atualizar
  const carregarDadosGraficos = async () => {
    if (abaDados !== 'graficos') return;
    
    setCarregandoGraficos(true);
    try {
      // Bate na API real do backend
      const dadosProdutos = await relatorioService.getProdutosMaisMovimentados(dataInicio, dataFim);
      const dadosCategoria = await relatorioService.getEstoqueCategoria(dataInicio, dataFim);

      setProdutosMovimentados(dadosProdutos || []);
      setEstoqueCategoria(dadosCategoria || []);
      
    } catch (error) {
      console.error('Erro ao carregar gráficos:', error);
      toast.error('Erro ao carregar dados dos gráficos.');
    } finally {
      setCarregandoGraficos(false);
    }
  };

  // Sempre que mudar a aba para gráficos, busca os dados
  useEffect(() => {
    if (abaDados === 'graficos') {
      carregarDadosGraficos();
    }
  }, [abaDados]);

  const handleGerarRelatorio = async (relatorio: Relatorio) => {
    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      toast.warning('Por favor, preencha a Data Inicial e a Data Final.');
      return;
    }

    if (!isValidDate(dataInicio) || !isValidDate(dataFim)) {
      toast.error('Datas inválidas. Por favor, insira datas válidas.');
      return;
    }

    if (dataInicio && dataFim && !isDateRangeValid(dataInicio, dataFim)) {
      toast.error('A data inicial não pode ser posterior à data final.');
      return;
    }

    setGerando(relatorio.tipo);
    try {
      await relatorio.metodo(dataInicio, dataFim);
      toast.success(`Relatório "${relatorio.titulo}" gerado!`, {
        description: 'O download começará automaticamente.'
      });
    } catch (error) {
      console.error('Erro ao gerar:', error);
      toast.error('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGerando(null);
    }
  };

  // Se o usuário aplicar um filtro de datas enquanto estiver na aba de gráficos
  const aplicarFiltroGraficos = () => {
    if (dataInicio && dataFim && !isDateRangeValid(dataInicio, dataFim)) {
      toast.error('A data inicial não pode ser posterior à data final.');
      return;
    }
    carregarDadosGraficos();
  };

  const getCorClasses = (cor: Relatorio['cor']) => {
    const map = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', hoverBorder: 'hover:border-blue-500/50' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', hoverBorder: 'hover:border-purple-500/50' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', hoverBorder: 'hover:border-red-500/50' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', hoverBorder: 'hover:border-green-500/50' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', hoverBorder: 'hover:border-orange-500/50' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20', hoverBorder: 'hover:border-cyan-500/50' }
    };
    return map[cor] || map.blue;
  };

  const totalProdutosMovimentados = useMemo(() => 
    produtosMovimentados.reduce((sum, p) => sum + p.quantidade, 0),
    [produtosMovimentados]
  );

  const totalEstoqueCategoria = useMemo(() => 
    estoqueCategoria.reduce((sum, c) => sum + c.quantidade, 0),
    [estoqueCategoria]
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Central de Relatórios</h1>
          <p className="text-muted-foreground">Exporte relatórios em PDF e visualize gráficos interativos</p>
        </div>

        <Card className="bg-card border-border shadow-sm w-full md:w-auto">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Calendar className="h-5 w-5 text-primary" />
              Período:
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                min="2000-01-01" max="2099-12-31"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground [color-scheme:light_dark]"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <span className="text-muted-foreground">até</span>
              <input 
                type="date" 
                min="2000-01-01" max="2099-12-31"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground [color-scheme:light_dark]"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            {abaDados === 'graficos' && (
              <Button variant="default" size="sm" onClick={aplicarFiltroGraficos}>
                Filtrar Gráficos
              </Button>
            )}
            {(dataInicio || dataFim) && (
              <Button 
                variant="ghost" size="sm" 
                onClick={() => {setDataInicio(''); setDataFim(''); if(abaDados === 'graficos') setTimeout(carregarDadosGraficos, 100); }} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={abaDados} onValueChange={(value) => setAbaDados(value as 'relatorios' | 'graficos')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="relatorios">Relatórios PDF</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos Interativos</TabsTrigger>
        </TabsList>

        {/* 📑 RELATÓRIOS PDF */}
        <TabsContent value="relatorios" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatorios.map((relatorio) => {
              const temaCores = getCorClasses(relatorio.cor);
              const Icone = relatorio.icone;
              const estaGerando = gerando === relatorio.tipo;

              return (
                <Card key={relatorio.id} className={`bg-card ${temaCores.border} border-2 hover:shadow-md transition-all duration-200 ${temaCores.hoverBorder}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`h-12 w-12 rounded-lg ${temaCores.bg} flex items-center justify-center`}>
                        <Icone className={`h-6 w-6 ${temaCores.text}`} />
                      </div>
                      <FileText className={`h-5 w-5 ${temaCores.text} opacity-30`} />
                    </div>
                    <CardTitle className="mt-4 text-lg">{relatorio.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground min-h-[40px] leading-relaxed">
                      {relatorio.descricao}
                    </p>
                    <Button
                      onClick={() => handleGerarRelatorio(relatorio)}
                      disabled={estaGerando}
                      className="w-full gap-2 transition-colors duration-200"
                      variant={estaGerando ? "secondary" : "default"}
                    >
                      {estaGerando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> Baixar PDF
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 📊 GRÁFICOS */}
        <TabsContent value="graficos" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setMostrarGraficos(!mostrarGraficos)} className="gap-2">
              {mostrarGraficos ? <><EyeOff className="h-4 w-4" /> Ocultar Gráficos</> : <><Eye className="h-4 w-4" /> Mostrar Gráficos</>}
            </Button>
          </div>

          {carregandoGraficos ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : mostrarGraficos ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Produtos Movimentados */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-500" /> Produtos Mais Movimentados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {produtosMovimentados.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={produtosMovimentados}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }} formatter={(value) => [`${value} movimentações`, 'Quantidade']} />
                            <Bar dataKey="quantidade" fill="#f97316" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-sm text-muted-foreground">Total de Movimentações</p>
                            <p className="text-2xl font-bold text-orange-500">{totalProdutosMovimentados}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Produtos Analisados</p>
                            <p className="text-2xl font-bold text-primary">{produtosMovimentados.length}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">Nenhum dado encontrado para o período.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico 2: Estoque por Categoria */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-cyan-500" /> Estoque por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estoqueCategoria.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={estoqueCategoria} dataKey="quantidade" nameKey="categoria" cx="50%" cy="50%" outerRadius={100} label={({ categoria, quantidade }) => `${categoria}: ${quantidade}`}>
                              {estoqueCategoria.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }} formatter={(value) => [`${value} unidades`, 'Quantidade']} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-sm text-muted-foreground">Total em Estoque</p>
                            <p className="text-2xl font-bold text-cyan-500">{totalEstoqueCategoria}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Categorias</p>
                            <p className="text-2xl font-bold text-primary">{estoqueCategoria.length}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">Nenhum dado encontrado para o período.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabela Resumo 1 */}
              {produtosMovimentados.length > 0 && (
                <Card className="bg-card border-border lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Detalhes de Movimentações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Produto</th>
                            <th className="text-right py-2 px-4 font-semibold text-muted-foreground">Movimentações</th>
                            <th className="text-right py-2 px-4 font-semibold text-muted-foreground">% do Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produtosMovimentados.map((produto, idx) => (
                            <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4">{produto.nome}</td>
                              <td className="text-right py-3 px-4 font-medium">{produto.quantidade}</td>
                              <td className="text-right py-3 px-4 text-muted-foreground">{((produto.quantidade / totalProdutosMovimentados) * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Gráficos ocultos. Clique em "Mostrar Gráficos" para visualizá-los.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}