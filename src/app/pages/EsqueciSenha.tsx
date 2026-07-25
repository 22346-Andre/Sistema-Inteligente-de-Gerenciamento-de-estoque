import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post('/auth/esqueci-senha', { email });
      // O backend sempre responde a mesma mensagem genérica (por segurança, não
      // revela se o e-mail existe) — então sempre tratamos como sucesso aqui.
      setEnviado(true);
    } catch (error: any) {
      const mensagem = error?.response?.data?.erro || error?.response?.data?.message || 'Erro ao solicitar recuperação. Tente novamente.';
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  };

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
              <KeyRound className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Recuperar senha</CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              {enviado ? 'Verifique seu e-mail' : 'Informe seu e-mail cadastrado'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <MailCheck className="h-12 w-12 text-green-400" />
              </div>
              <p className="text-sm text-gray-300">
                Se <strong>{email}</strong> estiver cadastrado no SmartStock, você vai receber um link de recuperação
                em instantes. O link é válido por 1 hora.
              </p>
              <p className="text-xs text-gray-500">Não recebeu? Verifique a caixa de spam antes de tentar de novo.</p>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-2 border-gray-700 text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o login
                </Button>
              </Link>
            </div>
          ) : (
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

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
              >
                {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-800">
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
