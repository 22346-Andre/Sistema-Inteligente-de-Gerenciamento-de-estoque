import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Package, AlertCircle, DollarSign, Lock, CheckCircle, PieChart, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { dashboardService } from '../services/dashboard.service';
import { produtoService, Produto } from '../services/produto.service';
import { toast } from 'sonner';
import api from '../services/api';

interface DashboardStats {
  capitalImobilizado: number;
  giroEstoque: number;
  totalProdutos: number;
  produtosCriticos: number;
}

const formatBRL = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const CORES_ABC: Record<string, string> = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };
const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    capitalImobilizado: 0, giroEstoque: 0, totalProdutos: 0, produtosCriticos: 0
  });

  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState<Produto[]>([]);
  const [todosProdutos, setTodosProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [acessoFinanceiroNegado, setAcessoFinanceiroNegado] = useState(false);

  // Estados para os dados REAIS do gráfico de perdas
  const [prejuizoTotal, setPrejuizoTotal] = useState(0);
  const [dadosGraficoPerdas, setDadosGraficoPerdas] = useState<{ mes: string; valor: number }[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);

    try {
      const resumo = await dashboardService.obterResumo();
      setStats(resumo);
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 403)) {
        setAcessoFinanceiroNegado(true);
      } else {
        toast.error('Erro ao carregar estatísticas financeiras.');
      }
    }

    try {
      const listaProdutos = await produtoService.listarTodos();
      setTodosProdutos(listaProdutos);
    } catch (error) {}

    try {
      const produtosCriticos = await produtoService.listarCriticos();
      setProdutosBaixoEstoque(produtosCriticos);
    } catch (error) {}

    // Prejuízo por perdas (QUEBRA_PERDA) dos últimos 3 meses.
    try {
      const resMovs = await api.get('/movimentacoes');
      const perdas = resMovs.data.filter((m: any) => m.tipo === 'QUEBRA_PERDA');

      // Janela identificada por ANO+mês, não só o nome do mês — senão uma perda de
      // "Janeiro" do ano passado seria somada junto com "Janeiro" deste ano assim
      // que o dashboard girasse pra um novo ano, inflando o mês errado no gráfico.
      const hoje = new Date();
      const janela = Array.from({ length: 3 }, (_, idx) => {
        const i = 2 - idx;
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        return { chave: `${d.getFullYear()}-${d.getMonth()}`, label: NOMES_MESES[d.getMonth()] };
      });

      const perdasPorChave: { [key: string]: number } = {};
      janela.forEach(({ chave }) => { perdasPorChave[chave] = 0; });

      let totalJanela = 0;

      perdas.forEach((p: any) => {
        if (!p.dataMovimentacao) return;
        const custo = p.produto?.precoCusto || 0;
        const valorPerdido = custo * p.quantidade;

        const dataPerda = new Date(p.dataMovimentacao);
        const chave = `${dataPerda.getFullYear()}-${dataPerda.getMonth()}`;

        if (perdasPorChave[chave] !== undefined) {
          perdasPorChave[chave] += valorPerdido;
          totalJanela += valorPerdido;
        }
      });

      setPrejuizoTotal(totalJanela);
      setDadosGraficoPerdas(janela.map(({ chave, label }) => ({ mes: label, valor: perdasPorChave[chave] })));
    } catch (error) {}

    setLoading(false);
  };

  // Curva ABC com contagem por classe além do percentual — só o "%" não dizia
  // quantos produtos existem em cada classe, o que dificultava entender por que
  // dois produtos pareciam "parecidos" mas caíam em classes diferentes.
  const dadosGraficoABC = useMemo(() => {
    if (todosProdutos.length === 0) return [];
    const contagem: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };

    todosProdutos.forEach((p) => {
      const letra = p.classificacaoABC as 'A' | 'B' | 'C' | undefined;
      if (letra && contagem[letra] !== undefined) contagem[letra]++;
    });

    const totalGeral = contagem.A + contagem.B + contagem.C;
    if (totalGeral === 0) return [];

    return (['A', 'B', 'C'] as const).map((letra) => ({
      categoria: `Classe ${letra}`,
      porcentagem: Math.round((contagem[letra] / totalGeral) * 100),
      produtos: contagem[letra],
      cor: CORES_ABC[letra],
    }));
  }, [todosProdutos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Calculando inteligência financeira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Visão geral e inteligência do seu estoque</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-green-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-gray-700 dark:text-white">Capital Imobilizado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            {acessoFinanceiroNegado ? (
              <div className="flex items-center text-gray-400 mt-2"><Lock className="h-5 w-5 mr-2" /><span className="text-sm font-medium">Acesso Restrito</span></div>
            ) : (
              <>
                <div className="text-2xl font-black text-foreground dark:text-white">{formatBRL(stats.capitalImobilizado)}</div>
                <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">Valor total em prateleira</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-gray-700 dark:text-white">Giro de Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            {acessoFinanceiroNegado ? (
              <div className="flex items-center text-gray-400 mt-2"><Lock className="h-5 w-5 mr-2" /><span className="text-sm font-medium">Acesso Restrito</span></div>
            ) : (
              <>
                <div className="text-2xl font-black text-foreground dark:text-white">{stats.giroEstoque}x</div>
                <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">Giro nos últimos 30 dias</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-gray-700 dark:text-white">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground dark:text-white">{stats.totalProdutos}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">Itens cadastrados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-gray-700 dark:text-white">Atenção Necessária</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.produtosCriticos}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">Estoque crítico / baixo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <Card className="shadow-md border-t-4 border-t-indigo-500 lg:col-span-1 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-lg">
              <PieChart className="h-5 w-5" /> Curva ABC
            </CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400">Produtos agrupados por valor parado em estoque</p>
          </CardHeader>
          <CardContent>
            {dadosGraficoABC.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosGraficoABC}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="categoria" fontSize={12} stroke="#9ca3af" />
                    <YAxis fontSize={12} stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: number, _name, item: any) => [
                        `${value}% do valor · ${item?.payload?.produtos ?? 0} produto(s)`,
                        'Participação',
                      ]}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    />
                    <Bar dataKey="porcentagem" radius={[4, 4, 0, 0]}>
                      {dadosGraficoABC.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {dadosGraficoABC.map((item) => (
                    <span key={item.categoria} className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.cor }} />
                      {item.categoria}: {item.produtos}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-t-4 border-t-red-500 lg:col-span-1 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-200 text-lg">
              <AlertTriangle className="h-5 w-5" /> Prejuízo por Perdas
            </CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400">Últimos 3 meses</p>
          </CardHeader>
          <CardContent>
            {acessoFinanceiroNegado ? (
               <div className="flex items-center justify-center h-[220px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Acesso Negado</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={dadosGraficoPerdas}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="mes" fontSize={12} stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: number) => formatBRL(value)}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    />
                    <Bar dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 text-center">
                  <span className="text-xs text-muted-foreground dark:text-gray-400 uppercase tracking-widest font-bold">Total nos Últimos 3 Meses</span>
                  <p className="text-xl font-black text-red-600 dark:text-red-400">{formatBRL(prejuizoTotal)}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-t-4 border-t-orange-500 lg:col-span-1 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-200 flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" /> Reposição Urgente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {produtosBaixoEstoque.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground dark:text-gray-400">
                  <CheckCircle className="h-10 w-10 text-green-500 dark:text-green-400 mb-2" />
                  <p className="font-bold text-green-700 dark:text-green-400">Tudo sob controle!</p>
                </div>
              ) : (
                produtosBaixoEstoque.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-gray-700/50 border border-orange-200 dark:border-gray-600 rounded-lg">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-orange-900 dark:text-orange-100 truncate max-w-[150px]">{produto.nome}</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Qtd: <span className="font-black text-red-600 dark:text-red-400">{produto.quantidade}</span></p>
                    </div>
                    <Link to={`/scanner`}>
                      <Button size="sm" variant="outline" className="border-orange-300 dark:border-orange-500 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 h-8">
                        Repor
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}