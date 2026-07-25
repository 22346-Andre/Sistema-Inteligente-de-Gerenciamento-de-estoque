import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha });
      toast.success('Senha redefinida com sucesso! Faça login com a nova senha.');
      navigate('/login');
    } catch (error: any) {
      const mensagem = error?.response?.data?.erro || error?.response?.data?.message || 'Erro ao redefinir a senha. O link pode ter expirado.';
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
        <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-gray-900/80 border-gray-800 text-white shadow-2xl">
          <CardContent className="text-center space-y-4 pt-6">
            <p className="text-sm text-gray-300">
              Link inválido. Solicite uma nova recuperação de senha.
            </p>
            <Link to="/esqueci-senha">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">Solicitar recuperação</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-gray-900/80 border-gray-800 text-white shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Nova senha</CardTitle>
            <CardDescription className="text-gray-400 mt-2">Escolha uma nova senha para sua conta</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="novaSenha" className="text-gray-300">Nova senha</Label>
              <Input
                id="novaSenha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha" className="text-gray-300">Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="Repita a senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Button
              type="submit"
              disabled={enviando}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
            >
              {enviando ? 'Salvando...' : 'Redefinir senha'}
            </Button>

            <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-800">
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
