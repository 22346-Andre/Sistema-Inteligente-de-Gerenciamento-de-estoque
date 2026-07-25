import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
// 🚨 Importação do Botão do Google
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // 🚨 Puxamos a função loginComGoogle do contexto!
  const { login, loginComGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, senha);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      
      const mensagem = error?.response?.data?.erro || error?.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(mensagem);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Animated Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Overlays */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Dot Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        {/* Animated Lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
          <div className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-gray-900/80 border-gray-800 text-white shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">EstoqueMax</CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Sistema de Gestão de Estoque
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-gray-300">Senha</Label>
                <Link to="/esqueci-senha" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
            >
              Entrar
            </Button>

            {/* DIVISÓRIA BONITA E BOTÃO DO GOOGLE */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#121826] px-2 text-gray-400">Ou continue com</span>
              </div>
            </div>

            <div className="flex justify-center pb-2">
              <GoogleLogin
                
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    try {
                      await loginComGoogle(credentialResponse.credential);
                      toast.success('Login com Google realizado com sucesso!');
                      navigate('/dashboard');
                    } catch (error) {
                      toast.error('Erro ao entrar. Certifique-se de que este e-mail está cadastrado no sistema.');
                    }
                  }
                }}
                onError={() => {
                  toast.error('O Login com o Google falhou.');
                  console.log('O Login com o Google falhou.');
                }}
                useOneTap
                theme="filled_black" // Tema escuro para combinar com sua tela!
              />
            </div>
            {/* FIM DO BLOCO DO GOOGLE */}

            <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-800">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Cadastre-se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-600 text-xs z-10">
        EstoqueMax © 2026 - Sistema de Gestão de Estoque
      </div>
    </div>
  );
}