import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { produtoService } from '../services/produto.service';
import type { AlertaVencimento } from '../services/produto.service';

// Tela nova: mostra os lotes perto de vencer (ou já vencidos) em toda a
// empresa. Antes esse dado só existia na query findLotesPertoDoVencimento,
// sem endpoint nem tela nenhuma consumindo.
export default function Vencimentos() {
  const [alertas, setAlertas] = useState<AlertaVencimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    carregar();
  }, [dias]);

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await produtoService.listarAlertasVencimento(dias);
      // já vencidos primeiro, depois quem vence mais cedo
      data.sort((a, b) => new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime());
      setAlertas(data);
    } catch (e) {
      toast.error('Erro ao carregar os alertas de vencimento.');
    } finally {
      setLoading(false);
    }
  };

  const diasParaVencer = (dataValidade: string) => {
    const hoje = new Date();
    const validade = new Date(dataValidade + 'T00:00:00');
    return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Vencimentos
          </h1>
          <p className="text-muted-foreground">Lotes vencidos ou perto de vencer, em todos os produtos.</p>
        </div>

        <div className="flex items-center gap-2">
          {[15, 30, 60, 90].map((opcao) => (
            <Button
              key={opcao}
              variant={dias === opcao ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDias(opcao)}
            >
              {opcao} dias
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader><CardTitle>Lotes na janela de {dias} dias</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : alertas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg border border-border">
              Nenhum lote vencendo nos próximos {dias} dias. 🎉
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Nº do Lote</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((alerta, idx) => {
                  const d = diasParaVencer(alerta.dataValidade);
                  const vencido = d < 0;

                  return (
                    <TableRow key={`${alerta.produtoId}-${alerta.numeroLote ?? idx}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-foreground">{alerta.produtoNome}</TableCell>
                      <TableCell className="text-muted-foreground">{alerta.numeroLote || '-'}</TableCell>
                      <TableCell>
                        <span className={vencido ? 'text-red-600 dark:text-red-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                          {format(new Date(alerta.dataValidade + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                          {vencido ? ` (vencido há ${Math.abs(d)}d)` : ` (em ${d}d)`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">{alerta.quantidade}</TableCell>
                      <TableCell className="text-center">
                        <Link to={`/produtos/${alerta.produtoId}`}>
                          <Button variant="ghost" size="sm">Ver produto</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
