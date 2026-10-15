import { useState, useEffect, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertCircle,
  Package,
  Download,
  Mail,
  MessageCircle,
  Gauge,
  Info,
  Wallet,
  Truck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { extrairMensagemErro } from '../services/api';
import { useAuth } from '../contexts/auth-context';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';

// Requer a lib de gráficos instalada: npm install recharts

interface Sugestao {
  produtoId: number;
  urgencia: string; // "URGENTE" ou "ATENCAO" — decisão final do backend (respeita a regra dura de estoque zerado)
  grauUrgencia: number; // 0 a 100 — score de prioridade de compra
  nomeProduto: string;
  nomeFornecedor: string;
  telefoneFornecedor: string;
  quantidadeAtual: number;
  estoqueMinimo: number;
  quantidadeSugerida: number;
  valorUnitario: number;
  valorTotal: number;
  // Explicabilidade — os mesmos insumos que alimentam o cálculo de prioridade,
  // já traduzidos pelo backend em rótulos legíveis para o gestor.
  nivelEstoqueLabel: string;   // "Baixo" | "Adequado" | "Alto"
  giroVendas: number;          // unidades vendidas nos últimos 30 dias
  giroVendasLabel: string;     // "Lento" | "Moderado" | "Rápido"
  prazoEntregaDias: number;
  prazoEntregaLabel: string;   // "Rápido" | "Aceitável" | "Demorado"
  urgenciaOrigem?: 'RUPTURA' | 'FUZZY'; // RUPTURA = botão de pânico (estoque zerado de item classe A/B)
  classeAbc?: string | null;
  consumoDiarioMedio?: number;          // un./dia, média dos últimos 30 dias
  quantidadeSugeridaMotivo?: string;    // explica de onde veio a quantidade sugerida
}

const formatBRL = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// Escala de cor contínua para o score de prioridade (0 a 100).
function corPrioridade(score: number) {
  if (score >= 70) return '#dc2626'; // vermelho — crítico
  if (score >= 55) return '#f97316'; // laranja — urgente
  if (score >= 30) return '#eab308'; // amarelo — atenção
  if (score >= 15) return '#3b82f6'; // azul — baixa
  return '#22c55e'; // verde — estável
}

function motivoPossivelSubestimativa(fornecedor: string) {
  if (!fornecedor || fornecedor === 'Sem Fornecedor') {
    return 'Sem fornecedor cadastrado — o prazo de entrega usado no cálculo é uma estimativa padrão, não o prazo real.';
  }
  return null;
}

export default function SugestoesCompra() {
  const { user } = useAuth();
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const podeEnviarEmail = ['ADMIN', 'SUPER_ADMIN', 'ESTOQUISTA'].includes(user?.role ?? '');

  useEffect(() => {
    carregarSugestoes();
  }, []);

  const carregarSugestoes = async () => {
    try {
      setLoading(true);
      setErroCarregamento(false);
      const response = await api.get('/sugestoes-compra');
      setSugestoes(response.data);
    } catch (error) {
      setErroCarregamento(true);
      toast.error(extrairMensagemErro(error, 'Erro ao carregar a lista de compras.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarPlanilha = async () => {
    try {
      toast.info("A gerar planilha...");
      const response = await api.get('/sugestoes-compra/planilha', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Planilha_de_Compras_SmartStock.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Planilha baixada com sucesso!");
    } catch (error) {
      toast.error(extrairMensagemErro(error, 'Erro ao baixar a planilha profissional.'));
    }
  };

  const handleEnviarEmail = async () => {
    const email = window.prompt("Para qual e-mail deseja enviar a planilha completa?")?.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um endereço de e-mail válido.');
      return;
    }

    const loadingToast = toast.loading("A enviar e-mail com a planilha e resumo...");
    try {
      await api.post('/sugestoes-compra/enviar-email', null, { params: { emailDestino: email } });
      toast.dismiss(loadingToast);
      toast.success("E-mail enviado com sucesso! Verifique a caixa de entrada.");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(extrairMensagemErro(error, 'Erro ao enviar o e-mail.'));
    }
  };

  //  WHATSAPP COM RESUMO INTELIGENTE AQUI
  // Observação: essa função já pega TODOS os itens do fornecedor informado,
  // então funciona igual tanto se chamada de um botão por produto quanto de
  // um botão único por grupo — por isso o agrupamento por fornecedor (abaixo)
  // deixa isso mais claro visualmente: um único "Pedir tudo" por fornecedor.
  const handlePedirFornecedor = (nomeFornecedor: string, telefone: string, itensDoFornecedor: Sugestao[]) => {
    if (!telefone) {
      toast.error(`O fornecedor ${nomeFornecedor} não tem telefone cadastrado!`);
      return;
    }

    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length < 10 || telLimpo.length > 15) {
      toast.error(`O telefone cadastrado para ${nomeFornecedor} é inválido.`);
      return;
    }

    let csvContent = "PRODUTO;QTD_COMPRAR\n";
    const escaparCampo = (valor: string) => {
      const seguro = valor.replace(/[\r\n]+/g, ' ').replace(/^([\t ]*[=+\-@])/, "'$1");
      return `"${seguro.replace(/"/g, '""')}"`;
    };
    itensDoFornecedor.forEach(item => {
      csvContent += `${escaparCampo(item.nomeProduto)};${item.quantidadeSugerida}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pedido_${nomeFornecedor.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    let resumo = "";
    const limite = 5;

    itensDoFornecedor.slice(0, limite).forEach(item => {
      resumo += `\n📦 ${item.quantidadeSugerida} un. de *${item.nomeProduto}*`;
    });

    if (itensDoFornecedor.length > limite) {
      resumo += `\n*(...e mais ${itensDoFornecedor.length - limite} itens detalhados na planilha)*`;
    }

    const numWhatsApp = telLimpo.length <= 11 ? `55${telLimpo}` : telLimpo;

    const textoZap = `Olá, aqui é do setor de compras.\n\nGostaria de fazer o pedido de reposição das seguintes mercadorias:${resumo}\n\nA planilha completa foi baixada para você anexar nesta conversa. Fico no aguardo do orçamento!`;
    const linkWhatsApp = `https://wa.me/${numWhatsApp}?text=${encodeURIComponent(textoZap)}`;

    const janelaWhatsApp = window.open('about:blank', '_blank');
    if (!janelaWhatsApp) {
      toast.error('O navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.');
      return;
    }
    janelaWhatsApp.opener = null;
    janelaWhatsApp.location.replace(linkWhatsApp);
    toast.success("Planilha baixada. Anexe-a na conversa do WhatsApp que foi aberta.", { duration: 6000 });
  };

  const totalSugestoes = sugestoes.length;
  const valorTotal = sugestoes.reduce((acc, curr) => acc + curr.valorTotal, 0);
  const urgentes = sugestoes.filter(s => s.urgencia === 'URGENTE').length;

  const mediaUrgencia = totalSugestoes > 0
    ? sugestoes.reduce((acc, curr) => acc + curr.grauUrgencia, 0) / totalSugestoes
    : 0;

  const quantidadeMediaSugerida = totalSugestoes > 0
    ? sugestoes.reduce((acc, curr) => acc + curr.quantidadeSugerida, 0) / totalSugestoes
    : 0;

  // "Pedido Médio" do bloco financeiro = quanto se gasta, em média, por fornecedor.
  const fornecedoresUnicos = useMemo(
    () => new Set(sugestoes.map(s => JSON.stringify([s.nomeFornecedor, s.telefoneFornecedor]))).size,
    [sugestoes]
  );
  const valorMedioPorFornecedor = fornecedoresUnicos > 0 ? valorTotal / fornecedoresUnicos : 0;

  const gaugeData = useMemo(() => ([
    { name: 'urgencia', value: mediaUrgencia, fill: corPrioridade(mediaUrgencia) },
  ]), [mediaUrgencia]);

  const investimentoPorUrgenciaData = useMemo(() => {
    const totalUrgente = sugestoes.filter(s => s.urgencia === 'URGENTE').reduce((a, c) => a + c.valorTotal, 0);
    const totalAtencao = sugestoes.filter(s => s.urgencia === 'ATENCAO').reduce((a, c) => a + c.valorTotal, 0);
    return [
      { name: 'Urgente', value: totalUrgente, fill: '#dc2626' },
      { name: 'Atenção', value: totalAtencao, fill: '#eab308' },
    ].filter(item => item.value > 0);
  }, [sugestoes]);

  const investimentoPorFornecedorData = useMemo(() => {
    const mapa = new Map<string, number>();
    sugestoes.forEach(s => {
      mapa.set(s.nomeFornecedor, (mapa.get(s.nomeFornecedor) || 0) + s.valorTotal);
    });
    return Array.from(mapa.entries())
      .map(([fornecedor, valor]) => ({ fornecedor, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [sugestoes]);

  // Camada 3: agrupa os itens por fornecedor (fornecedor mais crítico primeiro)
  // pra facilitar tanto a leitura quanto o disparo do pedido via WhatsApp.
  const gruposPorFornecedor = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: Sugestao[] }>();
    sugestoes.forEach(s => {
      const nome = s.nomeFornecedor || 'Sem Fornecedor';
      const chave = JSON.stringify([nome, s.telefoneFornecedor || '']);
      if (!mapa.has(chave)) mapa.set(chave, { nome, itens: [] });
      mapa.get(chave)!.itens.push(s);
    });

    return Array.from(mapa.values())
      .map(({ nome: fornecedor, itens }) => ({
        fornecedor,
        itens: [...itens].sort((a, b) => b.grauUrgencia - a.grauUrgencia),
        valorTotalGrupo: itens.reduce((a, c) => a + c.valorTotal, 0),
        maiorUrgencia: Math.max(...itens.map(i => i.grauUrgencia)),
        telefone: itens.find(i => i.telefoneFornecedor)?.telefoneFornecedor ?? '',
      }))
      .sort((a, b) => b.maiorUrgencia - a.maiorUrgencia);
  }, [sugestoes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sugestões de Compra</h1>
          <p className="text-muted-foreground">O que vai faltar amanhã e quanto isso vai custar hoje</p>
        </div>
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Não foi possível carregar as sugestões. Não é possível confirmar se o estoque está saudável.</p>
          <Button variant="outline" onClick={carregarSugestoes} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sugestões de Compra</h1>
        <p className="text-muted-foreground">O que vai faltar amanhã e quanto isso vai custar hoje</p>
      </div>

      {/* ================= CAMADA 1 — VISÃO EXECUTIVA ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco Financeiro */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-4 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Financeiro
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Investimento Necessário</p>
              <p className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{formatBRL(valorTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{totalSugestoes} produto{totalSugestoes !== 1 ? 's' : ''} para comprar</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedido Médio</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{formatBRL(valorMedioPorFornecedor)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                por fornecedor · {quantidadeMediaSugerida.toFixed(0)} un. em média por item
              </p>
            </div>
          </div>
        </div>

        {/* Bloco Operacional — Termômetro da IA */}
        <div className="rounded-2xl border border-border bg-muted/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> Operacional
          </p>
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="relative h-[120px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="72%"
                  outerRadius="100%"
                  data={gaugeData}
                  startAngle={90}
                  endAngle={90 - (360 * mediaUrgencia) / 100}
                  barSize={12}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: corPrioridade(mediaUrgencia) }}>
                  {mediaUrgencia.toFixed(0)}
                </span>
                <span
                  className="text-[10px] text-muted-foreground flex items-center gap-0.5"
                  title="Combina estoque atual, vendas recentes e prazo do fornecedor num único número de 0 a 100. Quanto maior, mais urgente é repor."
                >
                  urgência média <Info className="h-2.5 w-2.5 cursor-help" />
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Críticos</p>
              <p className="text-3xl md:text-4xl font-bold text-red-600 leading-tight">{urgentes}</p>
              <p className="text-xs text-muted-foreground mt-1">estoque zerado ou prioridade máxima</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CAMADA 2 — ESTRATÉGIA E DISTRIBUIÇÃO ================= */}
      {sugestoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investimento por Urgência</CardTitle>
              <p className="text-xs text-muted-foreground">Quanto do orçamento é crítico vs. preventivo</p>
            </CardHeader>
            <CardContent>
              <div className="relative h-[220px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={investimentoPorUrgenciaData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {investimentoPorUrgenciaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatBRL(value)}
                      contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-foreground">{formatBRL(valorTotal)}</span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Urgente
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Atenção
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investimento Necessário por Fornecedor</CardTitle>
              <p className="text-xs text-muted-foreground">Para onde vai o orçamento da semana</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={investimentoPorFornecedorData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => formatBRL(v)} />
                  <YAxis
                    type="category"
                    dataKey="fornecedor"
                    width={110}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                  />
                  <Bar dataKey="valor" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= CAMADA 3 — O CÉREBRO FUZZY E A AÇÃO ================= */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Lista Inteligente de Compras</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Agrupada por fornecedor · foque na prioridade para ver o motivo</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {podeEnviarEmail && (
              <Button onClick={handleEnviarEmail} variant="outline" disabled={sugestoes.length === 0} className="w-full sm:w-auto">
                <Mail className="mr-2 h-4 w-4" />
                E-mail Completo (Gestor)
              </Button>
            )}

            <Button onClick={handleBaixarPlanilha} disabled={sugestoes.length === 0} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Baixar Planilha (Completa)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {erroCarregamento ? (
            <div className="text-center py-12 text-muted-foreground">
              Os dados não estão disponíveis. Tente carregar novamente antes de decidir uma compra.
            </div>
          ) : sugestoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Ótimo trabalho! Nenhum produto está com estoque crítico no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urgência</TableHead>
                  <TableHead>
                    <span
                      className="inline-flex items-center gap-1"
                      title="Combina estoque atual, vendas recentes e prazo do fornecedor. Quanto maior, mais prioridade tem a compra."
                    >
                      Prioridade <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </span>
                  </TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right text-blue-600">Comprar</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposPorFornecedor.map((grupo) => (
                  <Fragment key={JSON.stringify([grupo.fornecedor, grupo.telefone])}>
                    {/* Cabeçalho do grupo — nome do fornecedor + ação em lote */}
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={6} className="py-2.5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="min-w-0 break-words" title={grupo.fornecedor}>{grupo.fornecedor}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              ({grupo.itens.length} {grupo.itens.length === 1 ? 'item' : 'itens'})
                            </span>
                            {motivoPossivelSubestimativa(grupo.fornecedor) && (
                              <span title={motivoPossivelSubestimativa(grupo.fornecedor) ?? ''}>
                                <Info className="h-3 w-3 text-amber-500 cursor-help" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-medium">{formatBRL(grupo.valorTotalGrupo)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-500/10 h-7 px-2"
                              title={`Pedir tudo de ${grupo.fornecedor} via WhatsApp`}
                              onClick={() => handlePedirFornecedor(grupo.fornecedor, grupo.telefone, grupo.itens)}
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">Pedir tudo</span>
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {grupo.itens.map((sugestao) => (
                      <TableRow key={sugestao.produtoId}>
                        <TableCell>
                          {sugestao.urgencia === 'URGENTE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="h-3 w-3" /> Urgente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Package className="h-3 w-3" /> Atenção
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {/* Tooltip de explicabilidade — "Por que comprar?" */}
                          <div className="relative group inline-block" tabIndex={0} role="group" aria-label={`Prioridade ${sugestao.grauUrgencia} de 100. Foque para ver os fatores de urgência.`}>
                            <div className="flex items-center gap-2 w-28 cursor-help">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${sugestao.grauUrgencia}%`,
                                    backgroundColor: corPrioridade(sugestao.grauUrgencia),
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground w-7 text-right">
                                {sugestao.grauUrgencia.toFixed(0)}
                              </span>
                            </div>

                            <div role="tooltip" className="invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute z-20 left-0 top-full mt-2 w-60 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-lg pointer-events-none">
                              <p className="font-semibold mb-1.5">Por que comprar?</p>
                              <ul className="space-y-1 text-gray-200">
                                <li>📦 Estoque: <b className="text-white">{sugestao.nivelEstoqueLabel}</b> ({sugestao.quantidadeAtual} un.)</li>
                                <li>🔄 Giro: <b className="text-white">{sugestao.giroVendasLabel}</b> ({sugestao.giroVendas} un./mês)</li>
                                <li>🚚 Fornecedor: <b className="text-white">{sugestao.prazoEntregaLabel}</b> ({sugestao.prazoEntregaDias} dias)</li>
                                {sugestao.urgenciaOrigem === 'RUPTURA' && (
                                  <li>🚨 <b className="text-white">Ruptura:</b> item classe {sugestao.classeAbc} sem estoque — prioridade elevada.</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[240px] truncate font-medium" title={sugestao.nomeProduto}>{sugestao.nomeProduto}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{sugestao.quantidadeAtual}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {/* Tooltip — "Por que essa quantidade?" */}
                          <div className="relative group inline-block cursor-help" tabIndex={0} role="group" aria-label={`Quantidade sugerida: ${sugestao.quantidadeSugerida}`}>
                            {sugestao.quantidadeSugerida}
                            {sugestao.quantidadeSugeridaMotivo && (
                              <div role="tooltip" className="invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute z-20 right-0 top-full mt-2 w-64 rounded-lg bg-gray-900 text-white text-xs font-normal text-left p-3 shadow-lg pointer-events-none">
                                <p className="font-semibold mb-1.5">Por que essa quantidade?</p>
                                <p className="text-gray-200">{sugestao.quantidadeSugeridaMotivo}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatBRL(sugestao.valorTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
