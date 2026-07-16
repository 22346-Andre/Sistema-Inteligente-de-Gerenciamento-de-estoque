import { useState, useEffect, useMemo } from 'react';
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
import { ShoppingCart, TrendingUp, AlertCircle, Package, Download, Mail, MessageCircle, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
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
  grauUrgencia: number; // 0 a 100 — saída bruta do motor fuzzy (nivel_estoque + giro_vendas + prazo_entrega)
  nomeProduto: string;
  nomeFornecedor: string;
  telefoneFornecedor: string;
  quantidadeAtual: number;
  estoqueMinimo: number;
  quantidadeSugerida: number;
  valorUnitario: number;
  valorTotal: number;
}

const formatBRL = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// Escala de cor contínua para o grau de urgência fuzzy (0 a 100).
// Não inventa uma nova classificação — é só a representação visual do
// mesmo número que o motor fuzzy (FuzzyUrgenciaService) já calcula.
function corGrauUrgencia(grau: number) {
  if (grau >= 70) return '#dc2626'; // vermelho — crítico
  if (grau >= 55) return '#f97316'; // laranja — urgente
  if (grau >= 30) return '#eab308'; // amarelo — atenção
  if (grau >= 15) return '#3b82f6'; // azul — baixa
  return '#22c55e'; // verde — estável
}

export default function SugestoesCompra() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSugestoes();
  }, []);

  const carregarSugestoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sugestoes-compra');
      setSugestoes(response.data);
    } catch (error) {
      toast.error("Erro ao carregar a lista de compras.");
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
      link.parentNode?.removeChild(link);
      toast.success("Planilha baixada com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar a planilha profissional.");
    }
  };

  const handleEnviarEmail = async () => {
    const email = window.prompt("Para qual e-mail deseja enviar a planilha completa?");
    if (!email) return;

    try {
      const loadingToast = toast.loading("A enviar e-mail com a planilha e resumo...");
      await api.post(`/sugestoes-compra/enviar-email?emailDestino=${email}`);
      toast.dismiss(loadingToast);
      toast.success("E-mail enviado com sucesso! Verifique a caixa de entrada.");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao enviar o e-mail.");
    }
  };

  // 🚨 A MÁGICA DO WHATSAPP COM RESUMO INTELIGENTE AQUI
  const handlePedirFornecedor = (nomeFornecedor: string, telefone: string) => {
    if (!telefone) {
      toast.error(`O fornecedor ${nomeFornecedor} não tem telefone cadastrado!`);
      return;
    }

    // 1. Pega apenas os itens deste fornecedor
    const itensDoFornecedor = sugestoes.filter(s => s.nomeFornecedor === nomeFornecedor);

    // 2. Cria a Mini-Planilha em CSV na hora (só com as coisas dele)
    let csvContent = "PRODUTO;QTD_COMPRAR\n";
    itensDoFornecedor.forEach(item => {
      csvContent += `${item.nomeProduto};${item.quantidadeSugerida}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pedido_${nomeFornecedor.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click(); // Força o download
    link.parentNode?.removeChild(link);

    // 3. Monta o pequeno RESUMO para o texto (Limite de 5 itens para não quebrar o link)
    let resumo = "";
    const limite = 5;

    itensDoFornecedor.slice(0, limite).forEach(item => {
      resumo += `\n📦 ${item.quantidadeSugerida} un. de *${item.nomeProduto}*`;
    });

    // Se tiver mais de 5 itens, avisa que o resto está na planilha
    if (itensDoFornecedor.length > limite) {
      resumo += `\n*(...e mais ${itensDoFornecedor.length - limite} itens detalhados na planilha)*`;
    }

    // 4. Limpa o telefone e cria a mensagem para o WhatsApp
    const telLimpo = telefone.replace(/\D/g, '');
    const numWhatsApp = telLimpo.length <= 11 ? `55${telLimpo}` : telLimpo;

    const textoZap = `Olá, aqui é do setor de compras.\n\nGostaria de fazer o pedido de reposição das seguintes mercadorias:${resumo}\n\n*A planilha completa do pedido está em anexo.* Fico no aguardo do orçamento!`;
    const linkWhatsApp = `https://wa.me/${numWhatsApp}?text=${encodeURIComponent(textoZap)}`;

    // 5. Mostra o aviso e abre o WhatsApp
    toast.success("Mini-planilha baixada! Arraste ela para a conversa do WhatsApp que vai abrir.", { duration: 6000 });

    setTimeout(() => {
      window.open(linkWhatsApp, '_blank');
    }, 1500);
  };

  const totalSugestoes = sugestoes.length;
  const valorTotal = sugestoes.reduce((acc, curr) => acc + curr.valorTotal, 0);
  const urgentes = sugestoes.filter(s => s.urgencia === 'URGENTE').length;
  const atencao = sugestoes.filter(s => s.urgencia === 'ATENCAO').length;

  // Índice médio de urgência calculado pelo motor fuzzy — dá a "temperatura"
  // geral da reposição de estoque num único número (0 a 100).
  const mediaUrgencia = totalSugestoes > 0
    ? sugestoes.reduce((acc, curr) => acc + curr.grauUrgencia, 0) / totalSugestoes
    : 0;

  // --- Dados para o gráfico "gauge" do índice médio de urgência ---
  const gaugeData = useMemo(() => ([
    { name: 'urgencia', value: mediaUrgencia, fill: corGrauUrgencia(mediaUrgencia) },
  ]), [mediaUrgencia]);

  // --- Dados para o donut: quanto do investimento é Urgente x Atenção ---
  const investimentoPorUrgenciaData = useMemo(() => {
    const totalUrgente = sugestoes.filter(s => s.urgencia === 'URGENTE').reduce((a, c) => a + c.valorTotal, 0);
    const totalAtencao = sugestoes.filter(s => s.urgencia === 'ATENCAO').reduce((a, c) => a + c.valorTotal, 0);
    return [
      { name: 'Urgente', value: totalUrgente, fill: '#dc2626' },
      { name: 'Atenção', value: totalAtencao, fill: '#eab308' },
    ].filter(item => item.value > 0);
  }, [sugestoes]);

  // --- Dados para o ranking dos produtos mais urgentes (top 8) ---
  const topUrgentesData = useMemo(() => {
    return [...sugestoes]
      .sort((a, b) => b.grauUrgencia - a.grauUrgencia)
      .slice(0, 8)
      .map(s => ({
        nome: s.nomeProduto.length > 18 ? s.nomeProduto.slice(0, 16) + '…' : s.nomeProduto,
        nomeCompleto: s.nomeProduto,
        grau: s.grauUrgencia,
        fill: corGrauUrgencia(s.grauUrgencia),
      }))
      .reverse(); // BarChart horizontal desenha de baixo pra cima
  }, [sugestoes]);

  // --- Dados para investimento necessário por fornecedor ---
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sugestões de Compra</h1>
        <p className="text-gray-600">Sistema inteligente de reposição de estoque · motor de lógica fuzzy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sugestões</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSugestoes}</div>
            <p className="text-xs text-gray-600">Produtos para comprar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(valorTotal)}</div>
            <p className="text-xs text-gray-600">Investimento necessário</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentes}</div>
            <p className="text-xs text-red-800">Estoque zerado ou crítico</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-900">Atenção</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{atencao}</div>
            <p className="text-xs text-yellow-800">Abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Índice Fuzzy Médio</CardTitle>
            <Gauge className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: corGrauUrgencia(mediaUrgencia) }}>
              {mediaUrgencia.toFixed(0)}<span className="text-sm font-medium text-slate-500">/100</span>
            </div>
            <p className="text-xs text-slate-600">Temperatura geral do estoque</p>
          </CardContent>
        </Card>
      </div>

      {sugestoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Índice de Urgência (IA)</CardTitle>
              <p className="text-xs text-gray-500">Média fuzzy de todos os produtos críticos</p>
            </CardHeader>
            <CardContent>
              <div className="relative h-[180px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={gaugeData}
                    startAngle={90}
                    endAngle={90 - (360 * mediaUrgencia) / 100}
                    barSize={16}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={20} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: corGrauUrgencia(mediaUrgencia) }}>
                    {mediaUrgencia.toFixed(0)}
                  </span>
                  <span className="text-xs text-gray-500">de 100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investimento por Urgência</CardTitle>
              <p className="text-xs text-gray-500">Quanto do valor total é crítico vs. preventivo</p>
            </CardHeader>
            <CardContent>
              <div className="relative h-[180px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={investimentoPorUrgenciaData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {investimentoPorUrgenciaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatBRL(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-gray-800">{formatBRL(valorTotal)}</span>
                  <span className="text-xs text-gray-500">total</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Urgente
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Atenção
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Produtos Mais Urgentes</CardTitle>
              <p className="text-xs text-gray-500">Maior grau de urgência calculado pelo fuzzy</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topUrgentesData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={100}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(0)}/100`, 'Grau de urgência']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nomeCompleto ?? ''}
                  />
                  <Bar dataKey="grau" radius={[0, 6, 6, 0]}>
                    {topUrgentesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {investimentoPorFornecedorData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investimento Necessário por Fornecedor</CardTitle>
            <p className="text-xs text-gray-500">Para onde vai o orçamento de reposição</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={investimentoPorFornecedorData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="fornecedor" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} width={90} />
                <Tooltip formatter={(value: number) => formatBRL(value)} />
                <Bar dataKey="valor" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista Inteligente de Compras</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Sugestões baseadas no estoque mínimo, giro de vendas e prazo de entrega (fuzzy)</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleEnviarEmail} variant="outline" disabled={sugestoes.length === 0}>
              <Mail className="mr-2 h-4 w-4" />
              E-mail Completo (Gestor)
            </Button>

            <Button onClick={handleBaixarPlanilha} disabled={sugestoes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Planilha (Completa)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sugestoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Ótimo trabalho! Nenhum produto está com estoque crítico no momento.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Índice Fuzzy</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right text-blue-600">Comprar</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                  <TableHead className="text-center">Ação (Fornecedor)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sugestoes.map((sugestao) => (
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
                      <div className="flex items-center gap-2 w-28">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${sugestao.grauUrgencia}%`,
                              backgroundColor: corGrauUrgencia(sugestao.grauUrgencia),
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-7 text-right">
                          {sugestao.grauUrgencia.toFixed(0)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="font-medium">{sugestao.nomeProduto}</TableCell>

                    <TableCell className="text-gray-600">
                      {sugestao.nomeFornecedor}
                    </TableCell>

                    <TableCell className="text-right font-medium text-red-600">{sugestao.quantidadeAtual}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">{sugestao.quantidadeSugerida}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(sugestao.valorTotal)}
                    </TableCell>

                    {/* 🚨 O BOTÃO DO WHATSAPP ESTÁ AQUI */}
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={`Pedir via WhatsApp para ${sugestao.nomeFornecedor}`}
                        onClick={() => handlePedirFornecedor(sugestao.nomeFornecedor, sugestao.telefoneFornecedor)}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
