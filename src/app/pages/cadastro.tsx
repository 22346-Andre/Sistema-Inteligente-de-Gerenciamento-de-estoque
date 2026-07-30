import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router'; 
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nomeDono: '',
    email: '',
    senha: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    celular: ''
  });
  
  // Estado para guardar os erros que vêm do Java
  const [erros, setErros] = useState<Record<string, string>>({});
  
  const { cadastrar, confirmarCadastro, reenviarCodigoCadastro, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  
  const [etapa, setEtapa] = useState<'formulario' | 'verificacao'>('formulario');
  const [codigo, setCodigo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [erroCodigo, setErroCodigo] = useState('');

  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MÁSCARA DE CNPJ
  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '') 
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1'); 
  };

  // MÁSCARA DE CELULAR
  const maskCelular = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1'); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cnpj') formattedValue = maskCNPJ(value);
    if (name === 'celular') formattedValue = maskCelular(value);

    setFormData({ ...formData, [name]: formattedValue });
    
    // Limpa o erro daquele campo quando o utilizador volta a escrever
    if (erros[name]) {
      setErros(prev => ({ ...prev, [name]: '' }));
    }
  };

  
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (enviando) return; // trava contra clique duplicado
    setEnviando(true);
    setErros({}); // Limpa os erros antigos
    
    try {
      // Limpa as máscaras para enviar só números para o Java
      const dadosParaEnviar = {
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        celular: formData.celular.replace(/\D/g, '')
      };

      await cadastrar(dadosParaEnviar);
      
      toast.success('Código de confirmação enviado! Confira seu e-mail.');
      setEtapa('verificacao');
      
    } catch (error: any) {
      console.error("❌ Ocorreu um erro ao cadastrar:", error);
      
      // 🎣 PESCAR OS ERROS DE VALIDAÇÃO DO JAVA
      if (error.response?.data?.detalhes) {
        const detalhesDoJava = error.response.data.detalhes;
        
        // Mapear os erros recebidos para os nomes do nosso form
        const novosErros: Record<string, string> = {};
        if (detalhesDoJava.nomeDono) novosErros.nomeDono = detalhesDoJava.nomeDono;
        if (detalhesDoJava.email) novosErros.email = detalhesDoJava.email;
        if (detalhesDoJava.senha) novosErros.senha = detalhesDoJava.senha;
        if (detalhesDoJava.cnpj) novosErros.cnpj = detalhesDoJava.cnpj;
        if (detalhesDoJava.razaoSocial) novosErros.razaoSocial = detalhesDoJava.razaoSocial;
        
        // O Java devolve "telefoneAdmin" ou "telefoneEmpresa", nós mapeamos para o "celular"
        if (detalhesDoJava.telefoneAdmin || detalhesDoJava.telefoneEmpresa) {
          novosErros.celular = detalhesDoJava.telefoneAdmin || detalhesDoJava.telefoneEmpresa;
        }

        setErros(novosErros);
        toast.error('Corrige os campos marcados a vermelho.');
      } else {
        // Se for um erro genérico (ex: CNPJ já existe)
        const mensagemErro = error.response?.data?.erro || error.response?.data?.message || 'Erro ao cadastrar.';
        toast.error(typeof mensagemErro === 'string' ? mensagemErro : 'Erro de validação nos dados.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleConfirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmando) return;
    setErroCodigo('');

    if (codigo.trim().length !== 6) {
      setErroCodigo('Informe os 6 dígitos do código.');
      return;
    }

    setConfirmando(true);
    try {
      await confirmarCadastro(formData.email, codigo.trim(), formData.senha);
      toast.success('E-mail confirmado! Cadastro concluído com sucesso.');
      navigate('/dashboard');
    } catch (error: any) {
      const mensagem = error.response?.data?.erro || error.response?.data?.message || 'Código inválido. Tente novamente.';
      setErroCodigo(mensagem);
      toast.error(mensagem);
    } finally {
      setConfirmando(false);
    }
  };

  const handleReenviarCodigo = async () => {
    if (reenviando) return;
    setReenviando(true);
    try {
      await reenviarCodigoCadastro(formData.email);
      toast.success('Novo código enviado! Confira seu e-mail.');
    } catch (error: any) {
      const mensagem = error.response?.data?.erro || 'Erro ao reenviar o código. Tente novamente em instantes.';
      toast.error(mensagem);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Efeitos de Fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <Card className="w-full max-w-2xl relative z-10 backdrop-blur-sm bg-gray-900/80 border-gray-800 text-white shadow-2xl my-8">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {etapa === 'formulario' ? 'Cadastre sua Empresa' : 'Confirme seu e-mail'}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              {etapa === 'formulario'
                ? 'Preencha os dados para começar a usar o EstoqueMax'
                : <>Enviamos um código de 6 dígitos para <strong className="text-gray-300">{formData.email}</strong></>}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {etapa === 'verificacao' ? (
            <form onSubmit={handleConfirmarCodigo} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="codigo" className={erroCodigo ? 'text-red-400' : 'text-gray-300'}>Código de confirmação</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); if (erroCodigo) setErroCodigo(''); }}
                  autoFocus
                  className={`bg-gray-800/50 text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:tracking-[0.5em] ${erroCodigo ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {erroCodigo && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1" />{erroCodigo}</p>}
                <p className="text-xs text-gray-500">O código expira em 15 minutos. Confira também a caixa de spam.</p>
              </div>

              <Button
                type="submit"
                disabled={confirmando}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {confirmando ? 'Confirmando...' : 'Confirmar e concluir cadastro'}
              </Button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEtapa('formulario')}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  ← Corrigir dados do cadastro
                </button>
                <button
                  type="button"
                  onClick={handleReenviarCodigo}
                  disabled={reenviando}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-60"
                >
                  {reenviando ? 'Reenviando...' : 'Reenviar código'}
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeDono" className={erros.nomeDono ? "text-red-400" : "text-gray-300"}>Nome do Dono</Label>
                <Input
                  id="nomeDono" name="nomeDono" placeholder="João Silva"
                  value={formData.nomeDono} onChange={handleChange} required
                  className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.nomeDono ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {erros.nomeDono && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.nomeDono}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="celular" className={erros.celular ? "text-red-400" : "text-gray-300"}>Celular</Label>
                <Input
                  id="celular" name="celular" placeholder="(11) 98765-4321" type="tel"
                  value={formData.celular} onChange={handleChange} required
                  className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.celular ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {erros.celular && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.celular}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={erros.email ? "text-red-400" : "text-gray-300"}>E-mail</Label>
                <Input
                  id="email" name="email" type="email" placeholder="seu@email.com"
                  value={formData.email} onChange={handleChange} required
                  className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {erros.email && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha" className={erros.senha ? "text-red-400" : "text-gray-300"}>Senha</Label>
                <Input
                  id="senha" name="senha" type="password" placeholder="••••••••"
                  value={formData.senha} onChange={handleChange} required
                  className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.senha ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {erros.senha && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.senha}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj" className={erros.cnpj ? "text-red-400" : "text-gray-300"}>CNPJ</Label>
              <Input
                id="cnpj" name="cnpj" placeholder="12.345.678/0001-90"
                value={formData.cnpj} onChange={handleChange} required
                className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.cnpj ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {erros.cnpj && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.cnpj}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="razaoSocial" className={erros.razaoSocial ? "text-red-400" : "text-gray-300"}>Razão Social</Label>
              <Input
                id="razaoSocial" name="razaoSocial" placeholder="Mercadinho Silva LTDA"
                value={formData.razaoSocial} onChange={handleChange} required
                className={`bg-gray-800/50 text-white placeholder:text-gray-500 ${erros.razaoSocial ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {erros.razaoSocial && <p className="text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1"/>{erros.razaoSocial}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeFantasia" className="text-gray-300">Nome Fantasia (Opcional)</Label>
              <Input
                id="nomeFantasia" name="nomeFantasia" placeholder="Mercadinho do João"
                value={formData.nomeFantasia} onChange={handleChange}
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Button 
              type="submit" 
              disabled={enviando}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </Button>

            <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-800">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Faça login
              </Link>
            </div>
          </form>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-600 text-xs z-10">
        EstoqueMax © 2026 - Sistema de Gestão de Estoque
      </div>
    </div>
  );
}