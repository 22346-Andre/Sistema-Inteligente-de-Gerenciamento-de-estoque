import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Building2,
  Package,
  Webhook,
  Save,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface Empresa {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  emailContato?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  diasParaEstoqueMorto?: number;
  webhookSecret?: string;
}

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

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

  const handleSalvar = async () => {
    if (!empresa) return;
    if (!empresa.razaoSocial?.trim()) {
      toast.error('A razão social é obrigatória.');
      return;
    }

    try {
      setSalvando(true);
      const response = await api.put('/empresas/minha-empresa', empresa);
      setEmpresa(response.data);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao salvar as configurações.');
    } finally {
      setSalvando(false);
    }
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

  return (
    <div className="space-y-6 text-foreground dark:text-gray-100">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Configurações</h1>
        <p className="text-muted-foreground dark:text-gray-400">Dados da empresa e comportamento do sistema</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="mb-4 bg-muted dark:bg-gray-800 text-muted-foreground dark:text-gray-400 border-border dark:border-gray-700">
          <TabsTrigger value="empresa" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white">
            <Building2 className="h-4 w-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white">
            <Package className="h-4 w-4" /> Estoque
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white">
            <Webhook className="h-4 w-4" /> Integrações
          </TabsTrigger>
        </TabsList>

        {/* ================= DADOS DA EMPRESA ================= */}
        <TabsContent value="empresa">
          <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Dados da Empresa</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">Essas informações aparecem em notas, relatórios e comunicações do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">CNPJ</Label>
                  <Input
                    className="bg-muted dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:disabled:text-gray-400"
                    value={empresa.cnpj}
                    disabled
                    title="O CNPJ não pode ser alterado por aqui"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Razão Social</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    value={empresa.razaoSocial || ''}
                    onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Nome Fantasia</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    value={empresa.nomeFantasia || ''}
                    onChange={(e) => setEmpresa({ ...empresa, nomeFantasia: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">E-mail de Contato</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    type="email"
                    value={empresa.emailContato || ''}
                    onChange={(e) => setEmpresa({ ...empresa, emailContato: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Telefone</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    value={empresa.telefone || ''}
                    onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Endereço</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    value={empresa.endereco || ''}
                    onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Cidade</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    value={empresa.cidade || ''}
                    onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground dark:text-gray-300">Estado</Label>
                  <Input
                    className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    maxLength={2}
                    placeholder="Ex: MA"
                    value={empresa.estado || ''}
                    onChange={(e) => setEmpresa({ ...empresa, estado: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= ESTOQUE ================= */}
        <TabsContent value="estoque">
          <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Comportamento do Estoque</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">Ajuste esses números pro ritmo real do seu negócio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label className="text-foreground dark:text-gray-300">Considerar produto parado após (dias sem venda)</Label>
                <Input
                  className="bg-background dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                  type="number"
                  min={1}
                  value={empresa.diasParaEstoqueMorto ?? 90}
                  onChange={(e) => setEmpresa({ ...empresa, diasParaEstoqueMorto: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Usado no painel "Dinheiro Congelado" do Dashboard. Uma loja de roupa de inverno e um mercadinho têm ciclos de giro bem diferentes — ajuste pro seu caso. Padrão: 90 dias.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= INTEGRAÇÕES — agora vive em /webhooks, com mais espaço
             pras instruções. Aqui fica só a porta de entrada, pra não manter a
             mesma lógica (segredo, regenerar, etc.) duplicada em dois arquivos. ================= */}
        <TabsContent value="integracoes">
          <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                <Webhook className="h-5 w-5 text-muted-foreground dark:text-gray-400" /> Webhooks de Vendas Externas
              </CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">
                Conecte a Shopee, o Mercado Livre ou qualquer outro canal de venda pra baixar o estoque automaticamente aqui quando vender lá fora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/webhooks">
                <Button className="gap-2">
                  Gerenciar Webhooks <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}