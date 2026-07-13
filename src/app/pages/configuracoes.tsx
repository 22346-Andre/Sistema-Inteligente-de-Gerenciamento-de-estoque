import { useState, useEffect, type ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Building2, Users, Plus, Edit, Trash2, Mail, Shield, Package, ShoppingCart, Crown, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { toast } from 'sonner';
import api from '../services/api';

interface Funcionario { id: number; nome: string; email: string; perfil: string; dono?: boolean; }

const CARGO_INFO: Record<string, { label: string; icone: ReactElement; badge: string; ring: string }> = {
  ADMIN: { label: 'Gerente / Admin', icone: <Shield className="h-4 w-4" />, badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', ring: 'ring-blue-500/30' },
  SUPER_ADMIN: { label: 'Gerente / Admin', icone: <Shield className="h-4 w-4" />, badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', ring: 'ring-blue-500/30' },
  ESTOQUISTA: { label: 'Estoquista', icone: <Package className="h-4 w-4" />, badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', ring: 'ring-orange-500/30' },
  CAIXA: { label: 'Caixa', icone: <ShoppingCart className="h-4 w-4" />, badge: 'bg-green-500/10 text-green-700 dark:text-green-400', ring: 'ring-green-500/30' },
};

const AVATAR_PALETTE = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  'bg-green-500/15 text-green-700 dark:text-green-400',
  'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  'bg-teal-500/15 text-teal-700 dark:text-teal-400',
];

function infoCargo(perfil: string) {
  return CARGO_INFO[perfil] ?? { label: perfil, icone: <Users className="h-4 w-4" />, badge: 'bg-muted text-muted-foreground', ring: 'ring-border' };
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corAvatar(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

// Aceita só dígitos (remove letras e símbolos digitados por engano) e
// formata como (99) 99999-9999 / (99) 9999-9999 enquanto a pessoa digita.
// Trava em 11 dígitos, que é o máximo de um celular brasileiro com DDD + 9.
function formatarCelular(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos.replace(/^(\d*)/, '($1');
  if (digitos.length <= 6) return digitos.replace(/^(\d{2})(\d*)/, '($1) $2');
  if (digitos.length <= 10) return digitos.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3');
  return digitos.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3');
}

// Um celular válido tem 10 dígitos (fixo) ou 11 (celular com 9º dígito).
// Campo vazio é aceito, já que o celular não é obrigatório no cadastro.
function celularValido(valor: string) {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 0 || digitos.length === 10 || digitos.length === 11;
}

export default function Configuracoes() {
  // Fix: `useAuth()` retorna um tipo próprio do contexto que não tem overlap
  // suficiente com o shape que usamos aqui, então o TS acusa "Conversion of
  // type X to type Y may be a mistake...". Passar por `unknown` primeiro é a
  // forma seguro de fazer essa conversão quando temos certeza do shape real
  // devolvido em runtime.
  const { user } = (useAuth() as unknown) as { user?: { id?: string; email?: string } };

  const [empresaData, setEmpresaData] = useState({ cnpj: '', razaoSocial: '', nomeFantasia: '', email: '', celular: '', endereco: '', cidade: '', estado: '' });
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregandoEquipe, setCarregandoEquipe] = useState(true);
  const [acessoEquipeNegado, setAcessoEquipeNegado] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState({ nome: '', email: '', senha: '', perfil: 'CAIXA' });
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [dialogEditFuncOpen, setDialogEditFuncOpen] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState<Funcionario | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    carregarEmpresa();
    carregarEquipe();
  }, []);

  const carregarEmpresa = async () => {
    try {
      const response = await api.get('/empresas/minha-empresa');
      setEmpresaData({
        cnpj: response.data.cnpj || '', razaoSocial: response.data.razaoSocial || '',
        nomeFantasia: response.data.nomeFantasia || '', email: response.data.emailContato || '',
        celular: response.data.telefone || '', endereco: response.data.endereco || '',
        cidade: response.data.cidade || '', estado: response.data.estado || ''
      });
    } catch (error) { toast.error('Não foi possível carregar os dados da empresa.'); }
  };

  const handleSalvarEmpresa = async () => {
    if (!empresaData.razaoSocial.trim()) {
      toast.error('Informe a Razão Social.');
      return;
    }
    if (!celularValido(empresaData.celular)) {
      toast.error('Informe um celular válido, com DDD (ex: (99) 98142-0899).');
      return;
    }
    if (salvandoEmpresa) return;
    setSalvandoEmpresa(true);
    try {
      const dados = {
        razaoSocial: empresaData.razaoSocial, nomeFantasia: empresaData.nomeFantasia, emailContato: empresaData.email,
        telefone: empresaData.celular, endereco: empresaData.endereco, cidade: empresaData.cidade, estado: empresaData.estado
      };
      await api.put('/empresas/minha-empresa', dados);
      toast.success('Dados da empresa atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar empresa.');
    } finally {
      setSalvandoEmpresa(false);
    }
  };

  const carregarEquipe = async () => {
    setCarregandoEquipe(true);
    setAcessoEquipeNegado(false);
    try {
      const response = await api.get('/usuarios');
      setFuncionarios(response.data);
    } catch (error: any) {
      if (error.response && (error.response.status === 400 || error.response.status === 403)) {
        setAcessoEquipeNegado(true);
      } else {
        toast.error('Erro ao carregar a equipe.');
      }
    } finally {
      setCarregandoEquipe(false);
    }
  };

  const validarNovoFuncionario = () => {
    if (!novoFuncionario.nome.trim()) return toast.error('Informe o nome.'), false;
    if (!/^\S+@\S+\.\S+$/.test(novoFuncionario.email)) return toast.error('Informe um e-mail válido.'), false;
    if (novoFuncionario.senha.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres.'), false;
    return true;
  };

  const handleAdicionarFuncionario = async () => {
    if (!validarNovoFuncionario()) return;
    if (salvandoNovo) return;
    setSalvandoNovo(true);
    try {
      await api.post('/usuarios', novoFuncionario);
      toast.success('Funcionário adicionado com sucesso!');
      setDialogOpen(false);
      setNovoFuncionario({ nome: '', email: '', senha: '', perfil: 'CAIXA' });
      carregarEquipe();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar funcionário.');
    } finally {
      setSalvandoNovo(false);
    }
  };

  const ehMinhaConta = (func: Funcionario) =>
    (user?.id !== undefined && String(user.id) === String(func.id)) || (!!user?.email && user.email === func.email);

  const handleSalvarEdicaoFuncionario = async () => {
    if (!funcionarioEditando) return;
    if (!funcionarioEditando.nome.trim() || !/^\S+@\S+\.\S+$/.test(funcionarioEditando.email)) {
      toast.error('Preencha nome e e-mail válidos.');
      return;
    }
    if (ehMinhaConta(funcionarioEditando) && funcionarioEditando.perfil !== 'ADMIN' && funcionarioEditando.perfil !== 'SUPER_ADMIN') {
      toast.error('Você não pode rebaixar o próprio cargo — peça a outro administrador para fazer essa alteração.');
      return;
    }
    if (salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      await api.put(`/usuarios/${funcionarioEditando.id}`, {
        nome: funcionarioEditando.nome,
        email: funcionarioEditando.email,
        perfil: funcionarioEditando.perfil
      });
      toast.success('Perfil atualizado com sucesso!');
      setDialogEditFuncOpen(false);
      carregarEquipe();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar funcionário.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleRemoverFuncionario = async (func: Funcionario) => {
    if (ehMinhaConta(func)) {
      toast.error('Você não pode excluir a própria conta por aqui. Peça a outro administrador.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja remover "${func.nome}" da equipe? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/usuarios/${func.id}`);
      toast.success('Funcionário removido com sucesso!');
      carregarEquipe();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover funcionário.');
    }
  };

  // O backend agora expõe um campo `dono` de verdade (setado uma única vez no
  // cadastro da empresa). Usamos ele como fonte da verdade. O cálculo por
  // menor ID fica só como fallback de segurança, pro caso raro de a tela ser
  // carregada antes da migração que preenche esse campo pra empresas antigas
  // ter rodado no banco.
  const algumMarcadoComoDono = funcionarios.some(f => f.dono === true);
  const donoDaLojaId = algumMarcadoComoDono
    ? (funcionarios.find(f => f.dono === true)?.id ?? -1)
    : (funcionarios.length > 0 ? Math.min(...funcionarios.map(f => f.id)) : -1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações e Equipe</h1>
        <p className="text-muted-foreground">Gerencie os dados da empresa e sua equipe</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="empresa" className="gap-2"><Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Empresa</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-2"><Users className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4">
          <Card className="bg-card border-border border-l-4 border-l-blue-500">
            <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">CNPJ <Lock className="h-3 w-3 text-muted-foreground" /></Label>
                  <Input value={empresaData.cnpj} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
                </div>
                <div className="space-y-2"><Label>Razão Social</Label><Input value={empresaData.razaoSocial} onChange={e => setEmpresaData({ ...empresaData, razaoSocial: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={empresaData.nomeFantasia} onChange={e => setEmpresaData({ ...empresaData, nomeFantasia: e.target.value })} /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={empresaData.email} onChange={e => setEmpresaData({ ...empresaData, email: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input
                    value={empresaData.celular}
                    onChange={e => setEmpresaData({ ...empresaData, celular: formatarCelular(e.target.value) })}
                    placeholder="(99) 98142-0899"
                    inputMode="numeric"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2"><Label>Endereço</Label><Input value={empresaData.endereco} onChange={e => setEmpresaData({ ...empresaData, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input value={empresaData.cidade} onChange={e => setEmpresaData({ ...empresaData, cidade: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={empresaData.estado} onChange={e => setEmpresaData({ ...empresaData, estado: e.target.value.toUpperCase() })} maxLength={2} /></div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSalvarEmpresa} disabled={salvandoEmpresa}>{salvandoEmpresa ? 'Salvando...' : 'Salvar Alterações'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe" className="space-y-4">
          <Card className="bg-card border-border border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestão de Equipe</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {funcionarios.length > 0 ? `${funcionarios.length} membro(s) · ` : ''}Adicione funcionários e gerencie permissões
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar Funcionário</DialogTitle><DialogDescription className="hidden">Janela para adicionar funcionário</DialogDescription></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Nome</Label><Input value={novoFuncionario.nome} onChange={e => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })} /></div>
                    <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={novoFuncionario.email} onChange={e => setNovoFuncionario({ ...novoFuncionario, email: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" value={novoFuncionario.senha} onChange={e => setNovoFuncionario({ ...novoFuncionario, senha: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <select className="w-full p-2 border border-input rounded-md bg-background text-foreground" value={novoFuncionario.perfil} onChange={e => setNovoFuncionario({ ...novoFuncionario, perfil: e.target.value })}>
                        <option value="CAIXA">Caixa</option>
                        <option value="ESTOQUISTA">Estoquista</option>
                        <option value="ADMIN">Gerente (Admin)</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={salvandoNovo}>Cancelar</Button>
                    <Button onClick={handleAdicionarFuncionario} disabled={salvandoNovo}>{salvandoNovo ? 'Adicionando...' : 'Adicionar'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogEditFuncOpen} onOpenChange={setDialogEditFuncOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Editar Funcionário</DialogTitle><DialogDescription className="hidden">Janela para editar perfil.</DialogDescription></DialogHeader>
                  {funcionarioEditando && (
                    <div className="space-y-4 py-4">
                      {ehMinhaConta(funcionarioEditando) && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                          <ShieldAlert className="h-4 w-4 shrink-0" /> Esta é a sua própria conta — você não pode reduzir o próprio cargo.
                        </div>
                      )}
                      <div className="space-y-2"><Label>Nome</Label><Input value={funcionarioEditando.nome} onChange={(e) => setFuncionarioEditando({ ...funcionarioEditando, nome: e.target.value })} /></div>
                      <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={funcionarioEditando.email} onChange={(e) => setFuncionarioEditando({ ...funcionarioEditando, email: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Nova Função (Perfil)</Label>
                        <select className="w-full p-2 border border-input rounded-md bg-background text-foreground" value={funcionarioEditando.perfil} onChange={(e) => setFuncionarioEditando({ ...funcionarioEditando, perfil: e.target.value })}>
                          <option value="CAIXA">Caixa</option>
                          <option value="ESTOQUISTA">Estoquista</option>
                          <option value="ADMIN">Gerente (Admin)</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogEditFuncOpen(false)} disabled={salvandoEdicao}>Cancelar</Button>
                    <Button onClick={handleSalvarEdicaoFuncionario} disabled={salvandoEdicao}>{salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {carregandoEquipe ? (
                <div className="text-center py-10 text-muted-foreground">Carregando equipe...</div>
              ) : acessoEquipeNegado ? (
                <div className="text-center py-10 text-muted-foreground bg-muted rounded-lg border border-border">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">Você não tem permissão para gerenciar a equipe.</p>
                  <p className="text-sm mt-1">Fale com um administrador da sua empresa se precisar acessar esta área.</p>
                </div>
              ) : funcionarios.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Nenhum funcionário cadastrado ainda.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Função</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {funcionarios.map(func => {
                      const cargo = infoCargo(func.perfil);
                      const souEu = ehMinhaConta(func);
                      return (
                        <TableRow key={func.id}>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${corAvatar(func.id)} ${cargo.ring}`}>
                                {iniciais(func.nome)}
                              </div>
                              <span>
                                {func.nome}
                                {souEu && <span className="ml-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">(você)</span>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell><div className="flex items-center gap-2 text-foreground"><Mail className="h-4 w-4 text-muted-foreground" />{func.email}</div></TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${cargo.badge}`}>
                              {cargo.icone} {cargo.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {func.id === donoDaLojaId ? (
                              <div className="flex justify-end pr-4 text-muted-foreground cursor-default" title="A conta do Dono é protegida e inalterável">
                                <Crown className="h-4 w-4 text-amber-500 opacity-80" />
                                <span className="text-[10px] ml-1 font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Dono</span>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setFuncionarioEditando(func); setDialogEditFuncOpen(true); }}>
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleRemoverFuncionario(func)}
                                  disabled={souEu}
                                  className="text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                                  title={souEu ? 'Você não pode excluir a própria conta' : 'Demitir / Excluir'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
