import { useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Lock, ShieldCheck, Mail, Building } from 'lucide-react';
import { toast } from 'sonner';
import { usuarioService } from '../services/usuario.service';

export default function Perfil() {
  // O TypeScript agora sabe que esta função existe!
  const { user, atualizarUsuarioNoContexto } = useAuth(); 
  
  const [nome, setNome] = useState(user?.nome || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPerfil(true);
    try {
      // 1. Manda o Java salvar no banco de dados
      await usuarioService.atualizarPerfil({ nome });
      
      // 2. Avisa ao React para mudar o nome na tela (Header) imediatamente
      if (atualizarUsuarioNoContexto) {
        atualizarUsuarioNoContexto(nome);
      }
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil.');
    }
    setLoadingPerfil(false);
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    // SEGURANÇA: Bloqueia se a nova senha for igual à atual
    if (senhaAtual === novaSenha) {
      toast.error('A nova senha não pode ser igual à sua senha atual!');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('A nova senha e a confirmação não coincidem!');
      return;
    }
    
    setLoadingSenha(true);
    try {
      await usuarioService.alterarSenha({ senhaAtual, novaSenha });
      toast.success('Senha alterada com segurança!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      toast.error(error.response?.data || 'Erro ao alterar a senha. Verifique sua senha atual.');
    }
    setLoadingSenha(false);
  };

  const getCargoFormatado = (role: string | undefined) => {
    if (role === 'SUPER_ADMIN') return 'Super Administrador (Dono)';
    if (role === 'ADMIN') return 'Gerente / Administrador';
    if (role === 'USER') return 'Operador / Vendedor';
    return 'Usuário Padrão';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações da Conta</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e credenciais de acesso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: INFORMAÇÕES */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-t-4 border-t-blue-600 shadow-sm">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mb-4 border-4 border-white shadow-md">
                <span className="text-3xl font-black text-blue-600">
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{user?.nome}</h2>
              
              <div className="mt-4 w-full space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-muted p-3 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-muted p-3 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-green-700">{getCargoFormatado(user?.role)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-muted p-3 rounded-lg">
                  <Building className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-purple-700">{user?.nomeFantasia || 'Empresa Vinculada'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIOS */}
        <div className="md:col-span-2 space-y-6">
          
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Atualize seu nome de exibição no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarPerfil} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loadingPerfil} className="bg-blue-600 hover:bg-blue-700">
                    {loadingPerfil ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                <Lock className="h-5 w-5 text-red-500" />
                Segurança e Senha
              </CardTitle>
              <CardDescription>Para sua segurança, não use senhas de outras contas.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAlterarSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirme a Nova Senha</label>
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="destructive" disabled={loadingSenha} className="bg-red-600 hover:bg-red-700">
                    {loadingSenha ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}