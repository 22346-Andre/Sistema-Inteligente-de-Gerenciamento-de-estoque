


import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Package, AlertCircle, DollarSign, Lock, CheckCircle, PieChart, AlertTriangle, Snowflake, Flame, Loader2, Settings2, Check, X, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { dashboardService } from '../services/dashboard.service';
import { produtoService, Produto } from '../services/produto.service';
import { toast } from 'sonner';
import api from '../services/api';
import { useCriterioAbc } from '../hooks/useCriterioAbc';
 
interface DashboardStats {
  // 🔒 vêm de /estatisticas (ADMIN/SUPER_ADMIN) — podem ficar bloqueados
  capitalImobilizado: number;
  giroEstoque: number;
  // 🟢 vêm de /dashboard/resumo (sem restrição) — nunca deveriam ficar bloqueados
  totalProdutos: number;
  produtosCriticos: number;
}
 
interface ItemEstoqueMorto {
  produtoId: number;
  nomeProduto: string;
  nomeFornecedor: string;
  quantidadeParada: number;
  valorUnitarioCusto: number;
  valorParado: number;
  diasSemVenda: number | null;
  dataUltimaVendaLabel: string;
  precoVendaAtual: number;
  precoVendaQueima: number;
  margemAjustada: boolean;
}
 
/**
 * Extrai uma mensagem legível dos formatos de erro que a API pode devolver:
 * - { erro: string, detalhes?: {...} } (formato padrão do TratadorDeErros global)
 * - { message: string } (formato manual usado em alguns endpoints)
 * - string pura / fallback para error.message (erro de rede, timeout, CORS, etc.)
 * Mesmo padrão usado em importacao.tsx, fornecedores.tsx e scanner.tsx.
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
 
  // Estados do painel "Dinheiro Congelado" (estoque morto)
  const [estoqueMorto, setEstoqueMorto] = useState<ItemEstoqueMorto[]>([]);
  const [totalCongelado, setTotalCongelado] = useState(0);
  const [acessoEstoqueMortoNegado, setAcessoEstoqueMortoNegado] = useState(false);
  const [gerandoPlanilhaQueima, setGerandoPlanilhaQueima] = useState(false);
  const [diasConsiderados, setDiasConsiderados] = useState(90);
  const [editandoDias, setEditandoDias] = useState(false);
  const [valorEditandoDias, setValorEditandoDias] = useState('90');
  const [salvandoDias, setSalvandoDias] = useState(false);
 
  useEffect(() => {
    carregarDados();
  }, []);
 
  const carregarDados = async () => {
    setLoading(true);
 
    
    try {
      const resumoGeral = await dashboardService.obterResumoGeral();
      setStats((prev) => ({
        ...prev,
        totalProdutos: resumoGeral.totalProdutos,
        produtosCriticos: resumoGeral.produtosCriticos,
      }));
    } catch (error: any) {
      toast.error(extrairMensagemErro(error, 'Erro ao carregar o resumo do estoque.'));
    }
 
    
    try {
      const financeiro = await dashboardService.obterEstatisticasFinanceiras();
      setStats((prev) => ({
        ...prev,
        capitalImobilizado: financeiro.capitalImobilizado,
        giroEstoque: financeiro.giroEstoque,
      }));
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 403)) {
        setAcessoFinanceiroNegado(true);
      } else {
        toast.error(extrairMensagemErro(error, 'Erro ao carregar estatísticas financeiras.'));
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
 
    // Dinheiro Congelado: produtos parados há mais de N dias sem venda
    try {
      const resEstoqueMorto = await api.get('/estoque-morto');
      setEstoqueMorto(resEstoqueMorto.data.itens ?? []);
      setTotalCongelado(resEstoqueMorto.data.totalCongelado ?? 0);
      const dias = resEstoqueMorto.data.diasConsiderados ?? 90;
      setDiasConsiderados(dias);
      setValorEditandoDias(String(dias));
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 403)) {
        setAcessoEstoqueMortoNegado(true);
      }
    }
 
    setLoading(false);
  };
 
  const handleSalvarDiasConsiderados = async () => {
    const novoValor = parseInt(valorEditandoDias, 10);
    if (isNaN(novoValor) || novoValor <= 0) {
      toast.error('Informe um número de dias maior que zero.');
      return;
    }
 
    try {
      setSalvandoDias(true);
      await api.put('/estoque-morto/configuracao', { dias: novoValor });
      setDiasConsiderados(novoValor);
      setEditandoDias(false);
      toast.success(`A partir de agora, produtos parados há +${novoValor} dias entram no painel.`);
      // Recarrega a lista com o novo critério
      const resEstoqueMorto = await api.get('/estoque-morto');
      setEstoqueMorto(resEstoqueMorto.data.itens ?? []);
      setTotalCongelado(resEstoqueMorto.data.totalCongelado ?? 0);
    } catch (error: any) {
      toast.error(extrairMensagemErro(error, 'Erro ao salvar a configuração.'));
    } finally {
      setSalvandoDias(false);
    }
  };
 
  const handleGerarPlanilhaQueima = async () => {
    try {
      setGerandoPlanilhaQueima(true);
      toast.info('Gerando lista de queima de estoque...');
      const response = await api.get('/estoque-morto/planilha', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Queima_Estoque_SmartStock.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Lista de queima de estoque baixada! Já vem com o preço sugerido de -30%.');
    } catch (error: any) {
      toast.error(extrairMensagemErro(error, 'Erro ao gerar a lista de queima de estoque.'));
    } finally {
      setGerandoPlanilhaQueima(false);
    }
  };
 
  // Item mais "parado" da lista — usado só pra dar contexto na frase de
  // destaque ("...sem saída desde X"); a lista completa já vem ordenada por
  // valor, então aqui procuramos especificamente o de mais dias sem vender.
  const itemMaisAntigo = useMemo(() => {
    if (estoqueMorto.length === 0) return null;
    return estoqueMorto.reduce((pior, atual) => {
      const diasPior = pior.diasSemVenda ?? Infinity;
      const diasAtual = atual.diasSemVenda ?? Infinity;
      return diasAtual > diasPior ? atual : pior;
    });
  }, [estoqueMorto]);
 
 
  
  
  const [criterioABC, setCriterioABC] = useCriterioAbc();
  const [curvaAbcItens, setCurvaAbcItens] = useState<Awaited<ReturnType<typeof dashboardService.obterCurvaABC>>>([]);
  const [carregandoABC, setCarregandoABC] = useState(false);

  useEffect(() => {
    if (acessoFinanceiroNegado || loading) return;
    setCarregandoABC(true);
    // A API da curva ABC não oferece o critério "giro"; use faturamento
    // como fallback para manter o seletor compatível com os critérios da UI.
    const criterioApi = criterioABC === 'giro' ? 'faturamento' : criterioABC;
    dashboardService.obterCurvaABC(criterioApi, 90)
      .then(setCurvaAbcItens)
      .catch(() => setCurvaAbcItens([]))
      .finally(() => setCarregandoABC(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterioABC, acessoFinanceiroNegado, loading]);

  const dadosGraficoABC = useMemo(() => {
    if (curvaAbcItens.length === 0) return [];
    const contagem: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };

    curvaAbcItens.forEach((item) => {
      if (contagem[item.classe] !== undefined) contagem[item.classe]++;
    });

    const totalGeral = contagem.A + contagem.B + contagem.C;
    if (totalGeral === 0) return [];

    return (['A', 'B', 'C'] as const).map((letra) => ({
      categoria: `Classe ${letra}`,
      porcentagem: Math.round((contagem[letra] / totalGeral) * 100),
      produtos: contagem[letra],
      cor: CORES_ABC[letra],
    }));
  }, [curvaAbcItens]);

  // Curva ABC de Estoque (capital imobilizado) — card fixo, separado do
  // seletor Faturamento/Lucratividade acima: não é mais uma opção que troca
  // o que aparece no mesmo gráfico, é uma classificação conceitualmente
  // diferente (estoque parado agora, não vendas de um período), então tem
  // card próprio, sempre visível.
  const [curvaEstoqueItens, setCurvaEstoqueItens] = useState<Awaited<ReturnType<typeof dashboardService.obterCurvaABC>>>([]);
  const [carregandoCurvaEstoque, setCarregandoCurvaEstoque] = useState(false);

  useEffect(() => {
    if (acessoFinanceiroNegado || loading) return;
    setCarregandoCurvaEstoque(true);
    dashboardService.obterCurvaABC('capital-imobilizado', 90)
      .then(setCurvaEstoqueItens)
      .catch(() => setCurvaEstoqueItens([]))
      .finally(() => setCarregandoCurvaEstoque(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acessoFinanceiroNegado, loading]);

  const dadosGraficoEstoque = useMemo(() => {
    if (curvaEstoqueItens.length === 0) return [];
    const contagem: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };

    curvaEstoqueItens.forEach((item) => {
      if (contagem[item.classe] !== undefined) contagem[item.classe]++;
    });

    const totalGeral = contagem.A + contagem.B + contagem.C;
    if (totalGeral === 0) return [];

    return (['A', 'B', 'C'] as const).map((letra) => ({
      categoria: `Classe ${letra}`,
      porcentagem: Math.round((contagem[letra] / totalGeral) * 100),
      produtos: contagem[letra],
      cor: CORES_ABC[letra],
    }));
  }, [curvaEstoqueItens]);
 
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
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral e inteligência do seu estoque</p>
      </div>
 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-green-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-green-700 dark:text-green-400">Capital Imobilizado</CardTitle>
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
            <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-400">Giro de Estoque</CardTitle>
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
 
        {/*  Total de Produtos e Atenção Necessária não dependem mais de
            acessoFinanceiroNegado — vêm de /dashboard/resumo, sem restrição. */}
        <Card className="shadow-sm border-l-4 border-l-purple-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-400">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground dark:text-white">{stats.totalProdutos}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium mt-1">Itens cadastrados</p>
          </CardContent>
        </Card>
 
        <Card className="shadow-sm border-l-4 border-l-red-500 dark:bg-gray-800 dark:border-gray-700 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-red-700 dark:text-red-400">Atenção Necessária</CardTitle>
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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-lg">
                <PieChart className="h-5 w-5" /> Curva ABC
              </CardTitle>
              {/*  Curva ABC é classificação por VALOR — Giro virou relatório próprio */}
              <select
                value={criterioABC}
                onChange={(e) => setCriterioABC(e.target.value as typeof criterioABC)}
                className="text-xs rounded-md border border-input bg-background text-foreground px-2 py-1"
                disabled={carregandoABC}
              >
                <option value="faturamento">Faturamento</option>
                <option value="lucratividade">Lucratividade</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Produtos agrupados por {criterioABC === 'faturamento' ? 'faturamento' : 'lucratividade'} nos últimos 90 dias
            </p>
          </CardHeader>
          <CardContent>
            {carregandoABC ? (
              <div className="flex items-center justify-center h-[220px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Calculando...</div>
            ) : dadosGraficoABC.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosGraficoABC}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="categoria" fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value: number, _name, item: any) => [
                        `${value}% do valor · ${item?.payload?.produtos ?? 0} produto(s)`,
                        'Participação',
                      ]}
                      contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" fontSize={12} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value: number) => formatBRL(value)}
                      cursor={{ fill: 'var(--muted)' }}
                      contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
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
                    <Link to={`/scanner?produto=${encodeURIComponent(produto.codigoBarras)}`}>
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

      {/* Curva ABC de Estoque (Exemplo 2 do artigo: classificação por capital
          imobilizado, não por vendas) — card de dados + card de instrução
          lado a lado, sem mexer no seletor Faturamento/Lucratividade acima. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-t-4 border-t-emerald-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 text-lg">
              <PieChart className="h-5 w-5" /> Curva ABC de Estoque
            </CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Produtos agrupados pelo valor parado em estoque hoje (quantidade × custo) — não depende de período
            </p>
          </CardHeader>
          <CardContent>
            {acessoFinanceiroNegado ? (
              <div className="flex items-center justify-center h-[220px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Acesso Restrito</div>
            ) : carregandoCurvaEstoque ? (
              <div className="flex items-center justify-center h-[220px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Calculando...</div>
            ) : dadosGraficoEstoque.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosGraficoEstoque}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="categoria" fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value: number, _name, item: any) => [
                        `${value}% do capital imobilizado · ${item?.payload?.produtos ?? 0} produto(s)`,
                        'Participação',
                      ]}
                      contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                    />
                    <Bar dataKey="porcentagem" radius={[4, 4, 0, 0]}>
                      {dadosGraficoEstoque.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {dadosGraficoEstoque.map((item) => (
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

        {/* Card de instrução — explica o que é esse indicador e quando usar,
            pra quem for ler o dashboard não precisar perguntar pro time de TI */}
        <Card className="shadow-md border-t-4 border-t-slate-400 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-lg">
              <Info className="h-5 w-5" /> O que é a Curva ABC de Estoque?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground dark:text-gray-400">
            <p>
              Diferente da Curva ABC por Faturamento ou Lucratividade (que olham pra o que foi vendido num período),
              essa curva olha pro que está parado no estoque agora: quantidade em mãos multiplicada pelo custo de
              cada produto.
            </p>
            <p>
              Ela responde uma pergunta diferente — não "o que mais vende", mas "onde está o meu capital parado".
              Uma empresa do setor metalúrgico usou essa mesma lógica e descobriu que apenas 20% dos itens
              armazenados concentravam 70% do capital imobilizado; com controle mais rígido de reposição só nesses
              itens, reduziu o valor total do estoque sem faltar produto na produção.
            </p>
            <ul className="space-y-1.5 pt-1">
              <li className="flex gap-2"><span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Classe A</span> — poucos itens, mas concentram a maior parte do dinheiro parado. Priorize aqui na hora de negociar prazos com fornecedor ou repensar quantidade de compra.</li>
              <li className="flex gap-2"><span className="font-bold text-yellow-600 dark:text-yellow-400 shrink-0">Classe B</span> — participação intermediária no capital parado.</li>
              <li className="flex gap-2"><span className="font-bold text-red-600 dark:text-red-400 shrink-0">Classe C</span> — muitos itens, mas cada um pesa pouco no total imobilizado.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tabela ranqueada — "onde está o meu dinheiro, em quais produtos".
          Reaproveita curvaEstoqueItens (já vem ordenado por valor desc do
          backend) e mostra produto a produto, não só o agregado por classe. */}
      {!acessoFinanceiroNegado && (
        <Card className="shadow-md border-t-4 border-t-emerald-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 text-lg">
              <DollarSign className="h-5 w-5" /> Onde está o meu dinheiro
            </CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Produtos ordenados do que mais pesa no capital imobilizado pro que menos pesa
            </p>
          </CardHeader>
          <CardContent>
            {carregandoCurvaEstoque ? (
              <div className="flex items-center justify-center h-[160px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Calculando...</div>
            ) : curvaEstoqueItens.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground dark:text-gray-400">
                      <th className="py-2 pr-3 font-medium">Produto</th>
                      <th className="py-2 pr-3 font-medium text-right">Qtd. em estoque</th>
                      <th className="py-2 pr-3 font-medium text-right">Valor imobilizado</th>
                      <th className="py-2 pr-3 font-medium text-right">% acumulado</th>
                      <th className="py-2 pl-3 font-medium text-center">Classe</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-[320px]">
                    {curvaEstoqueItens.map((item) => (
                      <tr key={item.produtoId} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-3 font-medium text-foreground dark:text-white truncate max-w-[220px]">{item.nomeProduto}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground dark:text-gray-400">{item.quantidade}</td>
                        <td className="py-2 pr-3 text-right font-bold text-foreground dark:text-white">{formatBRL(item.valorTotal)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground dark:text-gray-400">{item.percentualAcumulado}%</td>
                        <td className="py-2 pl-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                            style={{
                              backgroundColor: `${CORES_ABC[item.classe]}20`,
                              color: CORES_ABC[item.classe],
                              borderColor: `${CORES_ABC[item.classe]}20`,
                            }}
                          >
                            {item.classe}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-gray-400 bg-muted dark:bg-gray-900 rounded">Sem dados</div>
            )}
          </CardContent>
        </Card>
      )}
 
     
      {!acessoEstoqueMortoNegado && (
        <Card className="shadow-md border-t-4 border-t-cyan-500 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-cyan-900 dark:text-cyan-200 text-lg">
                <Snowflake className="h-5 w-5" /> Dinheiro Congelado
              </CardTitle>
 
              {!editandoDias ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Produtos parados há mais de {diasConsiderados} dias sem venda
                  </p>
                  <button
                    onClick={() => { setValorEditandoDias(String(diasConsiderados)); setEditandoDias(true); }}
                    title="Ajustar esse critério pro ritmo do seu negócio"
                    className="text-muted-foreground/70 hover:text-foreground dark:text-gray-400/70 dark:hover:text-gray-200 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground dark:text-gray-400">Considerar parado após</span>
                  <input
                    type="number"
                    min={1}
                    value={valorEditandoDias}
                    onChange={(e) => setValorEditandoDias(e.target.value)}
                    className="w-16 h-7 text-xs text-center rounded-md border border-input dark:border-gray-600 bg-background dark:bg-gray-700 text-foreground dark:text-white px-1"
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground dark:text-gray-400">dias</span>
                  <button
                    onClick={handleSalvarDiasConsiderados}
                    disabled={salvandoDias}
                    title="Salvar"
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                  >
                    {salvandoDias ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditandoDias(false)}
                    disabled={salvandoDias}
                    title="Cancelar"
                    className="text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {estoqueMorto.length > 0 && (
              <Button
                onClick={handleGerarPlanilhaQueima}
                disabled={gerandoPlanilhaQueima}
                className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white shrink-0"
              >
                {gerandoPlanilhaQueima ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  <><Flame className="h-4 w-4 mr-2" /> Gerar Lista para Queima de Estoque (-30%)</>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {estoqueMorto.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 py-4">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p className="font-bold">Nenhum produto parado há mais de {diasConsiderados} dias. Estoque saudável!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground dark:text-gray-200 leading-relaxed">
                  Você tem <span className="font-black text-2xl text-cyan-600 dark:text-cyan-400">{formatBRL(totalCongelado)}</span> parados
                  {' '}em {estoqueMorto.length} produto{estoqueMorto.length !== 1 ? 's' : ''} que não {estoqueMorto.length !== 1 ? 'têm' : 'tem'} saída.
                  {itemMaisAntigo && (
                    <> O pior caso é <strong>{itemMaisAntigo.nomeProduto}</strong>, {itemMaisAntigo.dataUltimaVendaLabel === 'Nunca vendeu' ? 'que nunca vendeu desde que foi cadastrado' : `parado ${itemMaisAntigo.dataUltimaVendaLabel}`}.</>
                  )}
                </p>
 
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {estoqueMorto.slice(0, 6).map((item) => (
                    <div
                      key={item.produtoId}
                      className="flex items-center justify-between text-sm bg-cyan-50 dark:bg-gray-700/50 border border-cyan-200 dark:border-gray-600 rounded-lg px-3 py-2"
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold text-cyan-900 dark:text-cyan-100 truncate flex items-center gap-1">
                          {item.nomeProduto}
                          {item.margemAjustada && (
                            <span title="Margem original menor que 30% — o preço de queima foi travado no custo (lucro zero) pra não vender no prejuízo">
                              <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400 shrink-0" />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-cyan-700 dark:text-gray-400">{item.dataUltimaVendaLabel} · {item.quantidadeParada} un.</p>
                      </div>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{formatBRL(item.valorParado)}</span>
                    </div>
                  ))}
                </div>
                {estoqueMorto.length > 6 && (
                  <p className="text-xs text-muted-foreground dark:text-gray-400 text-center mt-2">
                    + {estoqueMorto.length - 6} outro{estoqueMorto.length - 6 !== 1 ? 's' : ''} produto{estoqueMorto.length - 6 !== 1 ? 's' : ''} na planilha completa
                  </p>
                )}
                {estoqueMorto.some((i) => i.margemAjustada) && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-3">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {estoqueMorto.filter((i) => i.margemAjustada).length} produto{estoqueMorto.filter((i) => i.margemAjustada).length !== 1 ? 's têm' : ' tem'} margem menor que 30% — o preço de queima desses foi travado no custo (lucro zero) pra não vender no prejuízo.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
 





