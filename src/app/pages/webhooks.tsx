import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Webhook,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  Info,
  Code2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface EmpresaWebhook {
  id: number;
  webhookSecret?: string;
}

const CORPO_EXEMPLO = `{
  "origem": "MERCADO_LIVRE",
  "idPedido": "123456",
  "itens": [
    { "codigoBarras": "7891234567890", "quantidade": 2 }
  ]
}`;

export default function Webhooks() {
  const [empresa, setEmpresa] = useState<EmpresaWebhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [segredoVisivel, setSegredoVisivel] = useState(false);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  const carregarEmpresa = async () => {
    try {
      setLoading(true);
      const response = await api.get('/empresas/minha-empresa');
      setEmpresa(response.data);
    } catch (error) {
      toast.error('Erro ao carregar os dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerarSegredo = async () => {
    const jaTemSegredo = !!empresa?.webhookSecret;
    if (jaTemSegredo && !window.confirm(
      'Gerar um novo segredo vai invalidar o atual imediatamente. Qualquer integração (Shopee, Mercado Livre, etc.) configurada com o segredo antigo vai parar de funcionar até você atualizar lá também. Continuar?'
    )) {
      return;
    }

    try {
      setRegenerando(true);
      const response = await api.put('/empresas/minha-empresa/webhook-secret');
      setEmpresa((prev) => prev ? { ...prev, webhookSecret: response.data.webhookSecret } : prev);
      setSegredoVisivel(true);
      toast.success(jaTemSegredo ? 'Novo segredo gerado! O antigo parou de funcionar.' : 'Segredo gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar o segredo do webhook.');
    } finally {
      setRegenerando(false);
    }
  };

  const copiarParaAreaDeTransferencia = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
        Não foi possível carregar os dados da empresa.
      </div>
    );
  }

  const urlWebhook = `${api.defaults.baseURL}/api/webhooks/vendas`;

  return (
    <div className="space-y-6 text-foreground dark:text-gray-100">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground dark:text-white">
          <Webhook className="h-7 w-7 text-primary" /> Webhooks
        </h1>
        <p className="text-muted-foreground dark:text-gray-400">Conecte canais de venda externos (Shopee, Mercado Livre, loja própria...) pra baixar o estoque automaticamente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= SEGREDO ================= */}
        <Card className="lg:col-span-1 bg-card dark:bg-gray-800 border-border dark:border-gray-700 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground dark:text-white">
              <ShieldCheck className="h-4 w-4 text-muted-foreground dark:text-gray-400" /> Segredo de Autenticação
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">Só quem souber esse valor consegue registrar vendas na sua conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {empresa.webhookSecret ? (
              <div className="flex items-center gap-2">
                <Input
                  className="bg-muted dark:bg-gray-900 dark:border-gray-700 dark:text-white font-mono text-xs"
                  readOnly
                  type={segredoVisivel ? 'text' : 'password'}
                  value={empresa.webhookSecret}
                />
                <Button type="button" size="icon" variant="outline" onClick={() => setSegredoVisivel(!segredoVisivel)} title={segredoVisivel ? 'Ocultar' : 'Mostrar'} className="dark:border-gray-700 dark:hover:bg-gray-700">
                  {segredoVisivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={() => copiarParaAreaDeTransferencia(empresa.webhookSecret!, 'Segredo')} title="Copiar" className="dark:border-gray-700 dark:hover:bg-gray-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 rounded-md p-3 text-sm">
                Nenhum segredo gerado ainda. Gere um antes de configurar qualquer integração — sem ele, toda requisição é rejeitada.
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerarSegredo}
              disabled={regenerando}
              className="w-full dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              {regenerando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> {empresa.webhookSecret ? 'Gerar novo segredo' : 'Gerar segredo'}</>
              )}
            </Button>

            {empresa.webhookSecret && (
              <p className="text-xs text-muted-foreground dark:text-gray-400 flex items-start gap-1.5">
                <Info className="h-3 w-3 shrink-0 mt-0.5" /> Gerar um novo invalida o atual na hora — qualquer integração já configurada vai parar de funcionar até você atualizar o segredo lá também.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ================= INSTRUÇÕES ================= */}
        <Card className="lg:col-span-2 bg-card dark:bg-gray-800 border-border dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground dark:text-white">
              <Code2 className="h-4 w-4 text-muted-foreground dark:text-gray-400" /> Como configurar no seu canal de vendas
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">Copie e cole essas três informações onde o canal externo pedir os dados do webhook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <p className="text-muted-foreground dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
                Endereço (URL) do webhook
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted dark:bg-gray-900 border border-border dark:border-gray-700 text-foreground dark:text-gray-200 rounded-md px-3 py-2 font-mono text-xs overflow-x-auto">
                  {urlWebhook}
                </code>
                <Button type="button" size="icon" variant="outline" onClick={() => copiarParaAreaDeTransferencia(urlWebhook, 'Endereço')} className="dark:border-gray-700 dark:hover:bg-gray-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
                Cabeçalho (header) obrigatório em toda requisição
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted dark:bg-gray-900 border border-border dark:border-gray-700 text-foreground dark:text-gray-200 rounded-md px-3 py-2 font-mono text-xs overflow-x-auto">
                  X-Webhook-Secret: {empresa.webhookSecret || '(gere um segredo ao lado primeiro)'}
                </code>
                {empresa.webhookSecret && (
                  <Button type="button" size="icon" variant="outline" onClick={() => copiarParaAreaDeTransferencia(`X-Webhook-Secret: ${empresa.webhookSecret}`, 'Cabeçalho')} className="dark:border-gray-700 dark:hover:bg-gray-700">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
                Corpo (body) da requisição, em JSON
              </p>
              <div className="flex items-start gap-2">
                <pre className="flex-1 bg-muted dark:bg-gray-900 border border-border dark:border-gray-700 text-foreground dark:text-gray-200 rounded-md px-3 py-2 font-mono text-xs overflow-x-auto whitespace-pre">
{CORPO_EXEMPLO}
                </pre>
                <Button type="button" size="icon" variant="outline" onClick={() => copiarParaAreaDeTransferencia(CORPO_EXEMPLO, 'Corpo do JSON')} className="dark:border-gray-700 dark:hover:bg-gray-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1.5">
                Não é preciso informar o ID da sua empresa no JSON — o sistema já sabe quem é você a partir do cabeçalho <code>X-Webhook-Secret</code>, com mais segurança.
              </p>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1.5">
                <code>codigoBarras</code> precisa bater com um produto já cadastrado no SmartStock. A requisição sempre retorna sucesso (200), mesmo se algum item da venda não puder ser processado (produto não encontrado ou estoque insuficiente) — os demais itens da mesma venda continuam sendo processados normalmente, e você recebe um alerta dentro do sistema avisando qual item falhou e por quê, pra você não precisar ficar monitorando logs.
              </p>
            </div>

            <div className="bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 rounded-md p-3 flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Cada baixa de estoque feita pelo webhook aparece no histórico de movimentações do produto, com o motivo "Venda Externa" — dá pra auditar depois igual qualquer outra venda, na tela de detalhes de cada produto.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50 dark:bg-gray-800/50 border-border dark:border-gray-700 shadow-none border-dashed">
        <CardContent className="pt-6 flex items-start gap-3 text-sm text-muted-foreground dark:text-gray-400">
          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Se um item da venda externa não tiver estoque suficiente ou o produto não for encontrado, essa linha é ignorada e o resto da venda continua sendo processado normalmente — nada trava por causa de um item só.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}