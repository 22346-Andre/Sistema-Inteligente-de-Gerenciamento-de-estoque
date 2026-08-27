import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  FileText, Download, BarChart3, Package, AlertTriangle, Calendar,
  TrendingUp, Layers, Eye, EyeOff, Boxes, ListOrdered, PieChart as PieChartIcon, Calculator
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

// Paleta coesa e desenhada pra este dashboard — matizes espaçados de forma
// consistente em saturação/luminosidade, em vez do arco-íris padrão do recharts.
const CORES_GRAFICO = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#22c55e', // green
  '#ec4899', // pink
  '#64748b', // slate
];

// Escurece um hex em `amount` (0-1) — usado pra gerar a "face lateral" do
// efeito 3D da pizza e o tom de base do gradiente das barras.
function escurecer(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 255) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

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
      titulo: 'Relatório Contábil (DRE Simplificado)',
      descricao: 'Receita, CMV, lucro bruto e perdas do período — visão gerencial de resultado.',
      icone: Calculator,
      tipo: 'contabil',
      cor: 'purple',
      metodo: (inicio, fim) => relatorioService.downloadContabilPdf(inicio, fim)
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
    },
    {
      id: '7',
      titulo: 'Inventário Fiscal',
      descricao: 'Relatório completo para prestação de contas e auditorias fiscais (Bloco H/SPED).',
      icone: BarChart3,
      tipo: 'inventario',
      cor: 'indigo',
      metodo: (inicio, fim) => relatorioService.downloadInventarioPdf(inicio, fim)
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

  // Produto/categoria líder de cada gráfico — usado nos cards de KPI e no
  // destaque visual (badge) dentro dos próprios gráficos.
  const produtoLider = useMemo(() =>
    produtosMovimentados.length
      ? [...produtosMovimentados].sort((a, b) => b.quantidade - a.quantidade)[0]
      : null,
    [produtosMovimentados]
  );

  const categoriaLider = useMemo(() =>
    estoqueCategoria.length
      ? [...estoqueCategoria].sort((a, b) => b.quantidade - a.quantidade)[0]
      : null,
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
            <div className="space-y-6">

              {/* Cards de KPI — visão executiva rápida, antes de entrar nos gráficos */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icone={ListOrdered}
                  label="Total de Movimentações"
                  valor={totalProdutosMovimentados}
                  cor="#f97316"
                />
                <KpiCard
                  icone={TrendingUp}
                  label="Produto Líder"
                  valor={produtoLider ? produtoLider.nome : '—'}
                  sublinha={produtoLider ? `${produtoLider.quantidade} movimentações` : undefined}
                  cor="#f59e0b"
                  textoMenor
                />
                <KpiCard
                  icone={Boxes}
                  label="Total em Estoque"
                  valor={totalEstoqueCategoria}
                  cor="#0ea5e9"
                />
                <KpiCard
                  icone={Layers}
                  label="Categorias Ativas"
                  valor={estoqueCategoria.length}
                  sublinha={categoriaLider ? `Maior: ${categoriaLider.categoria}` : undefined}
                  cor="#6366f1"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Gráfico 1: Produtos Movimentados */}
                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      </span>
                      Produtos Mais Movimentados
                    </CardTitle>
                    <p className="text-xs text-muted-foreground pl-10 -mt-1">Ranking por volume de entradas e saídas</p>
                  </CardHeader>
                  <CardContent>
                    {produtosMovimentados.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={produtosMovimentados} margin={{ top: 24, right: 8, left: -16, bottom: 8 }}>
                            <defs>
                              <linearGradient id="gradienteBarra" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fb923c" />
                                <stop offset="100%" stopColor="#f97316" />
                              </linearGradient>
                              <linearGradient id="gradienteBarraLider" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fdba74" />
                                <stop offset="100%" stopColor="#ea580c" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                            <XAxis
                              dataKey="nome"
                              angle={-35}
                              textAnchor="end"
                              height={64}
                              interval={0}
                              tick={{ fontSize: 11, fill: 'currentColor' }}
                              className="text-muted-foreground"
                              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: 'currentColor' }}
                              className="text-muted-foreground"
                              axisLine={false}
                              tickLine={false}
                              width={28}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                              contentStyle={{
                                backgroundColor: 'rgba(15,15,20,0.92)',
                                border: '1px solid rgba(249,115,22,0.35)',
                                borderRadius: 8,
                                fontSize: 13,
                              }}
                              labelStyle={{ color: '#fdba74', fontWeight: 600, marginBottom: 4 }}
                              itemStyle={{ color: '#fff' }}
                              formatter={(value: number) => [`${value} movimentações`, 'Quantidade']}
                            />
                            <Bar dataKey="quantidade" radius={[8, 8, 0, 0]} maxBarSize={56}>
                              {produtosMovimentados.map((entry, index) => (
                                <Cell
                                  key={`barra-${index}`}
                                  fill={entry.nome === produtoLider?.nome ? 'url(#gradienteBarraLider)' : 'url(#gradienteBarra)'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Movimentações</p>
                            <p className="text-2xl font-bold text-orange-500">{totalProdutosMovimentados}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Produtos Analisados</p>
                            <p className="text-2xl font-bold text-primary">{produtosMovimentados.length}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <EstadoVazio icone={TrendingUp} />
                    )}
                  </CardContent>
                </Card>

                {/* Gráfico 2: Estoque por Categoria — pizza com efeito 3D */}
                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <PieChartIcon className="h-4 w-4 text-cyan-500" />
                      </span>
                      Estoque por Categoria
                    </CardTitle>
                    <p className="text-xs text-muted-foreground pl-10 -mt-1">Distribuição do estoque total</p>
                  </CardHeader>
                  <CardContent>
                    {estoqueCategoria.length > 0 ? (
                      <>
                        <div className="flex flex-col md:flex-row items-center gap-2">
                          <ResponsiveContainer width="100%" height={280} className="md:flex-[1.3]">
                            <PieChart>
                              <defs>
                                {estoqueCategoria.map((_, index) => {
                                  const cor = CORES_GRAFICO[index % CORES_GRAFICO.length];
                                  return (
                                    <radialGradient id={`fatiaGrad-${index}`} key={index} cx="35%" cy="35%" r="75%">
                                      <stop offset="0%" stopColor={cor} stopOpacity={1} />
                                      <stop offset="100%" stopColor={escurecer(cor, 0.25)} stopOpacity={1} />
                                    </radialGradient>
                                  );
                                })}
                                <filter id="sombraPizza" x="-30%" y="-30%" width="160%" height="160%">
                                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
                                </filter>
                              </defs>

                              {/* Camada de baixo: a "face lateral" do cilindro — cria a ilusão de espessura/3D */}
                              <Pie
                                data={estoqueCategoria}
                                dataKey="quantidade"
                                nameKey="categoria"
                                cx="50%"
                                cy="53%"
                                innerRadius={44}
                                outerRadius={92}
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                                isAnimationActive={false}
                              >
                                {estoqueCategoria.map((entry, index) => (
                                  <Cell
                                    key={`sombra-${index}`}
                                    fill={escurecer(CORES_GRAFICO[index % CORES_GRAFICO.length], 0.4)}
                                  />
                                ))}
                              </Pie>

                              {/* Camada de cima: a face visível, com gradiente radial + sombra projetada */}
                              <Pie
                                data={estoqueCategoria}
                                dataKey="quantidade"
                                nameKey="categoria"
                                cx="50%"
                                cy="50%"
                                innerRadius={44}
                                outerRadius={92}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={1.5}
                                stroke="var(--card)"
                                strokeWidth={2}
                                filter="url(#sombraPizza)"
                              >
                                {estoqueCategoria.map((_, index) => (
                                  <Cell key={`face-${index}`} fill={`url(#fatiaGrad-${index})`} />
                                ))}
                              </Pie>

                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(15,15,20,0.92)',
                                  border: '1px solid rgba(14,165,233,0.35)',
                                  borderRadius: 8,
                                  fontSize: 13,
                                }}
                                labelStyle={{ color: '#7dd3fc', fontWeight: 600, marginBottom: 4 }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number, _name, item: any) => [
                                  `${value} unidades (${((value / totalEstoqueCategoria) * 100).toFixed(1)}%)`,
                                  item?.payload?.categoria,
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Legenda organizada em lista, com barrinha de proporção — muito mais
                              legível que rótulos espremidos ao redor da pizza */}
                          <div className="w-full md:flex-1 space-y-1.5 md:max-h-[260px] md:overflow-y-auto pr-1">
                            {[...estoqueCategoria]
                              .sort((a, b) => b.quantidade - a.quantidade)
                              .map((item) => {
                                const indexOriginal = estoqueCategoria.indexOf(item);
                                const cor = CORES_GRAFICO[indexOriginal % CORES_GRAFICO.length];
                                const pct = (item.quantidade / totalEstoqueCategoria) * 100;
                                return (
                                  <div key={item.categoria} className="flex items-center gap-2 text-xs">
                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                                    <span className="flex-1 truncate text-foreground">{item.categoria}</span>
                                    <span className="text-muted-foreground tabular-nums">{item.quantidade}</span>
                                    <span className="w-11 text-right font-medium tabular-nums" style={{ color: cor }}>
                                      {pct.toFixed(1)}%
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total em Estoque</p>
                            <p className="text-2xl font-bold text-cyan-500">{totalEstoqueCategoria}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Categorias</p>
                            <p className="text-2xl font-bold text-primary">{estoqueCategoria.length}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <EstadoVazio icone={Layers} />
                    )}
                  </CardContent>
                </Card>

                {/* Tabela Resumo */}
                {produtosMovimentados.length > 0 && (
                  <Card className="bg-card border-border lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Detalhes de Movimentações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Produto</th>
                              <th className="text-right py-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Movimentações</th>
                              <th className="text-right py-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide w-48">% do Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...produtosMovimentados]
                              .sort((a, b) => b.quantidade - a.quantidade)
                              .map((produto, idx) => {
                                const pct = (produto.quantidade / totalProdutosMovimentados) * 100;
                                return (
                                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-medium">{produto.nome}</td>
                                    <td className="text-right py-3 px-4 tabular-nums">{produto.quantidade}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2 justify-end">
                                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="text-muted-foreground tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
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

// Card compacto de KPI usado na faixa acima dos gráficos.
function KpiCard({
  icone: Icone,
  label,
  valor,
  sublinha,
  cor,
  textoMenor,
}: {
  icone: any;
  label: string;
  valor: string | number;
  sublinha?: string;
  cor: string;
  textoMenor?: boolean;
}) {
  return (
    <Card className="bg-card border-border relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: cor }} />
      <CardContent className="p-4 pl-5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className={`font-bold truncate ${textoMenor ? 'text-lg' : 'text-2xl'}`} style={{ color: cor }}>
            {valor}
          </p>
          {sublinha && <p className="text-xs text-muted-foreground truncate mt-0.5">{sublinha}</p>}
        </div>
        <span className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cor}1A` }}>
          <Icone className="h-4.5 w-4.5" style={{ color: cor }} />
        </span>
      </CardContent>
    </Card>
  );
}

// Estado vazio padronizado para os dois gráficos.
function EstadoVazio({ icone: Icone }: { icone: any }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Icone className="h-8 w-8 opacity-30" />
      <p className="text-sm">Nenhum dado encontrado para o período.</p>
    </div>
  );
}
