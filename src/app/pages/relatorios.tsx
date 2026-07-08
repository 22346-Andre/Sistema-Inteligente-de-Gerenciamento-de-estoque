import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Download, BarChart3, Package, AlertTriangle, Calendar } from 'lucide-react';
import { relatorioService } from '../services/relatorio.service';
import { toast } from 'sonner';

interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  icone: any;
  tipo: string;
  cor: 'blue' | 'purple' | 'red' | 'green';
  metodo: (inicio?: string, fim?: string) => Promise<void>;
}

export default function Relatorios() {
  const [gerando, setGerando] = useState<string | null>(null);
  
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

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
    }
  ];

  // Validação de data: verifica se a data é válida e está em um limite realista
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return true; // campo vazio é válido
    
    const date = new Date(dateString);
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;

    // Garante que o ano digitado tem 4 dígitos (ex: entre 2000 e 2099)
    const year = date.getFullYear();
    return year >= 2000 && year <= 2099;
  };

  // Verifica se dataInicio é anterior a dataFim
  const isDateRangeValid = (inicio: string, fim: string): boolean => {
    if (!inicio || !fim) return true;
    
    const dataInicioObj = new Date(inicio);
    const dataFimObj = new Date(fim);
    
    return dataInicioObj <= dataFimObj;
  };

  const handleGerarRelatorio = async (relatorio: Relatorio) => {
    // Validação 1: Se preencher uma, tem de preencher a outra
    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      toast.warning('Por favor, preencha a Data Inicial e a Data Final.');
      return;
    }

    // Validação 2: Verifica se as datas são válidas
    if (!isValidDate(dataInicio) || !isValidDate(dataFim)) {
      toast.error('Datas inválidas. Por favor, insira datas válidas.');
      return;
    }

    // Validação 3: Verifica se a data inicial é anterior à data final
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

  const getCorClasses = (cor: Relatorio['cor']) => {
    const map = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', hoverBorder: 'hover:border-blue-500/50' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', hoverBorder: 'hover:border-purple-500/50' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', hoverBorder: 'hover:border-red-500/50' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', hoverBorder: 'hover:border-green-500/50' }
    };
    return map[cor] || map.blue;
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Central de Relatórios</h1>
          <p className="text-muted-foreground">Exporte relatórios em PDF</p>
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
                min="2000-01-01"
                max="2099-12-31"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground [color-scheme:light_dark]"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <span className="text-muted-foreground">até</span>
              <input 
                type="date" 
                min="2000-01-01"
                max="2099-12-31"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground [color-scheme:light_dark]"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            {(dataInicio || dataFim) && (
              <Button variant="ghost" size="sm" onClick={() => {setDataInicio(''); setDataFim('');}} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}