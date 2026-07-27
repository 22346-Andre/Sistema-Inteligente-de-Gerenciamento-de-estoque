import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Truck,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  categoriasFornecidas?: string;
}

type FornecedorForm = Omit<Fornecedor, 'id'>;

const FORNECEDOR_VAZIO: FornecedorForm = {
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  categoriasFornecidas: '',
};

// =========================================================
//  Máscaras e validações client-side.
//  Não substituem a validação do backend (@CNPJ, @NotBlank),
//  mas evitam requisições desnecessárias e dão feedback imediato.
// =========================================================
const formatarCNPJ = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');

const formatarTelefone = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2');

function cnpjValido(valorFormatado: string): boolean {
  const cnpj = valorFormatado.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (tamanho: number) => {
    const numeros = cnpj.substring(0, tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += Number(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado;
  };

  const digitos = cnpj.substring(12);
  if (calcularDigito(12) !== Number(digitos.charAt(0))) return false;
  if (calcularDigito(13) !== Number(digitos.charAt(1))) return false;
  return true;
}

function emailValido(valor: string): boolean {
  if (!valor) return true; // e-mail é opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/** Telefone é opcional, mas se preenchido precisa ter DDD + número (10 ou 11 dígitos). */
function telefoneValido(valor: string): boolean {
  if (!valor) return true;
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 10 || digitos.length === 11;
}

/**
 * Dado um telefone bruto (possivelmente legado/corrompido, ex.: importado de um XML
 * sem validação), devolve a versão mascarada e sinaliza se o dado foge do padrão
 * esperado (nem 10 nem 11 dígitos) para exibirmos um aviso na tela em vez de
 * simplesmente truncar o valor em silêncio.
 */
function analisarTelefoneExibicao(valorBruto: string | null | undefined): { texto: string; suspeito: boolean } {
  if (!valorBruto) return { texto: '', suspeito: false };
  const digitos = valorBruto.replace(/\D/g, '');
  if (digitos.length === 0) return { texto: '', suspeito: false };
  const suspeito = digitos.length !== 10 && digitos.length !== 11;
  return { texto: formatarTelefone(digitos), suspeito };
}

/**
 * A validação por dígito verificador (cnpjValido) só garante que o número é
 * matematicamente possível — não que ele existe de verdade. Aqui consultamos a
 * Receita Federal (via BrasilAPI, pública e sem necessidade de chave) para
 * confirmar a existência real do CNPJ. Falha de rede/CORS/indisponibilidade NÃO
 * bloqueia o cadastro — vira apenas um aviso, já que o backend continua sendo a
 * fonte de verdade da validação estrutural.
 */
async function consultarCnpjReceita(cnpjFormatado: string): Promise<{ situacao: 'encontrado'; dados: any } | { situacao: 'nao_encontrado' } | { situacao: 'indisponivel' }> {
  const digitos = cnpjFormatado.replace(/\D/g, '');
  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`);
    if (resposta.status === 404) return { situacao: 'nao_encontrado' };
    if (!resposta.ok) return { situacao: 'indisponivel' };
    const dados = await resposta.json();
    return { situacao: 'encontrado', dados };
  } catch {
    return { situacao: 'indisponivel' };
  }
}

function montarEnderecoReceita(dados: any): string {
  return [dados.logradouro, dados.numero, dados.bairro, dados.municipio, dados.uf]
    .filter((parte) => parte && String(parte).trim())
    .join(', ');
}

/**
 * Extrai uma mensagem legível dos formatos de erro que a API realmente devolve:
 * - string pura (ex.: rotas de /importacao)
 * - { erro: string, detalhes?: { campo: mensagem } } (TratadorDeErros do backend)
 * - fallback para error.message (erro de rede, timeout, etc.)
 */
function extrairMensagemErro(error: any, fallback: string): string {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    if (data.detalhes && typeof data.detalhes === 'object') {
      const mensagens = Object.values(data.detalhes).filter(Boolean);
      if (mensagens.length) return mensagens.join(' | ');
    }
    if (typeof data.erro === 'string' && data.erro) return data.erro;
    if (typeof data.message === 'string' && data.message) return data.message;
  }

  if (error?.message === 'Network Error') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }

  return error?.message || fallback;
}

interface ErrosForm {
  nome?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
}

function validarFormulario(form: FornecedorForm): ErrosForm {
  const erros: ErrosForm = {};
  if (!form.nome.trim()) erros.nome = 'O nome é obrigatório.';
  if (!form.cnpj.trim()) {
    erros.cnpj = 'O CNPJ é obrigatório.';
  } else if (!cnpjValido(form.cnpj)) {
    erros.cnpj = 'CNPJ inválido. Confira os números digitados.';
  }
  if (form.email && !emailValido(form.email)) {
    erros.email = 'Informe um e-mail válido.';
  }
  if (form.telefone && !telefoneValido(form.telefone)) {
    erros.telefone = 'Telefone inválido. Informe DDD + número (10 ou 11 dígitos).';
  }
  return erros;
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [searchParams] = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get('q') || '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState<FornecedorForm>(FORNECEDOR_VAZIO);
  const [errosNovo, setErrosNovo] = useState<ErrosForm>({});
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [verificandoCnpjNovo, setVerificandoCnpjNovo] = useState(false);
  const [avisoCnpjNovo, setAvisoCnpjNovo] = useState<{ tipo: 'ok' | 'alerta'; texto: string } | null>(null);

  const [dialogEditOpen, setDialogEditOpen] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [errosEdicao, setErrosEdicao] = useState<ErrosForm>({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [verificandoCnpjEdicao, setVerificandoCnpjEdicao] = useState(false);
  const [avisoCnpjEdicao, setAvisoCnpjEdicao] = useState<{ tipo: 'ok' | 'alerta'; texto: string } | null>(null);

  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  useEffect(() => {
    const queryVoz = searchParams.get('q');
    if (queryVoz !== null) {
      setBusca(queryVoz);
    }
  }, [searchParams]);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    setCarregando(true);
    setErroCarregamento(false);
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data);
    } catch (error) {
      setErroCarregamento(true);
      toast.error('Erro ao carregar fornecedores', {
        description: extrairMensagemErro(error, 'Não foi possível carregar a lista de fornecedores.'),
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleAdicionarFornecedor = async () => {
    const erros = validarFormulario(novoFornecedor);
    setErrosNovo(erros);
    if (Object.keys(erros).length > 0) return;

    setSalvandoNovo(true);
    try {
      await api.post('/fornecedores', novoFornecedor);
      toast.success('Fornecedor adicionado com sucesso!');
      setDialogOpen(false);
      setNovoFornecedor(FORNECEDOR_VAZIO);
      setErrosNovo({});
      carregarFornecedores();
    } catch (error) {
      toast.error('Erro ao adicionar fornecedor', {
        description: extrairMensagemErro(error, 'Não foi possível salvar o fornecedor.'),
      });
    } finally {
      setSalvandoNovo(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!fornecedorEditando) return;

    const erros = validarFormulario(fornecedorEditando);
    setErrosEdicao(erros);
    if (Object.keys(erros).length > 0) return;

    setSalvandoEdicao(true);
    try {
      await api.put(`/fornecedores/${fornecedorEditando.id}`, fornecedorEditando);
      toast.success('Fornecedor atualizado com sucesso!');
      setDialogEditOpen(false);
      setErrosEdicao({});
      carregarFornecedores();
    } catch (error) {
      toast.error('Erro ao atualizar fornecedor', {
        description: extrairMensagemErro(error, 'Não foi possível atualizar o fornecedor.'),
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluirFornecedor = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o fornecedor "${nome}"? Esta ação não pode ser desfeita.`)) return;

    setExcluindoId(id);
    try {
      await api.delete(`/fornecedores/${id}`);
      toast.success('Fornecedor excluído com sucesso!');
      setFornecedores((atual) => atual.filter((f) => f.id !== id));
    } catch (error) {
      toast.error('Erro ao excluir fornecedor', {
        description: extrairMensagemErro(
          error,
          'Não foi possível excluir o fornecedor. Ele pode estar vinculado a produtos existentes.'
        ),
      });
    } finally {
      setExcluindoId(null);
    }
  };

  const abrirEdicao = (fornecedor: Fornecedor) => {
    setFornecedorEditando({
      ...fornecedor,
      endereco: fornecedor.endereco ?? '',
      telefone: analisarTelefoneExibicao(fornecedor.telefone).texto,
    });
    setErrosEdicao({});
    setAvisoCnpjEdicao(null);
    setDialogEditOpen(true);
  };

  const handleVerificarCnpjNovo = async () => {
    if (!cnpjValido(novoFornecedor.cnpj)) return;
    setVerificandoCnpjNovo(true);
    setAvisoCnpjNovo(null);
    const resultado = await consultarCnpjReceita(novoFornecedor.cnpj);
    if (resultado.situacao === 'nao_encontrado') {
      setAvisoCnpjNovo({
        tipo: 'alerta',
        texto: 'Não encontramos este CNPJ na Receita Federal. Confira se os números estão corretos antes de salvar.',
      });
    } else if (resultado.situacao === 'encontrado') {
      const dados = resultado.dados;
      const razaoSocial = dados.razao_social || dados.nome_fantasia;
      setAvisoCnpjNovo({
        tipo: 'ok',
        texto: razaoSocial ? `CNPJ verificado na Receita Federal: ${razaoSocial}.` : 'CNPJ verificado na Receita Federal.',
      });
      // Só preenche automaticamente campos que o usuário ainda não digitou.
      setNovoFornecedor((atual) => ({
        ...atual,
        nome: atual.nome.trim() ? atual.nome : razaoSocial || atual.nome,
        telefone: atual.telefone.trim()
          ? atual.telefone
          : dados.ddd_telefone_1
          ? formatarTelefone(dados.ddd_telefone_1)
          : atual.telefone,
        email: atual.email.trim() ? atual.email : dados.email || atual.email,
        endereco: atual.endereco.trim() ? atual.endereco : montarEnderecoReceita(dados) || atual.endereco,
      }));
    }
    // 'indisponivel' (offline/CORS/instabilidade): não bloqueia nem avisa, falha silenciosa.
    setVerificandoCnpjNovo(false);
  };

  const handleVerificarCnpjEdicao = async () => {
    if (!fornecedorEditando || !cnpjValido(fornecedorEditando.cnpj)) return;
    setVerificandoCnpjEdicao(true);
    setAvisoCnpjEdicao(null);
    const resultado = await consultarCnpjReceita(fornecedorEditando.cnpj);
    if (resultado.situacao === 'nao_encontrado') {
      setAvisoCnpjEdicao({
        tipo: 'alerta',
        texto: 'Não encontramos este CNPJ na Receita Federal. Confira se os números estão corretos antes de salvar.',
      });
    } else if (resultado.situacao === 'encontrado') {
      const razaoSocial = resultado.dados.razao_social || resultado.dados.nome_fantasia;
      setAvisoCnpjEdicao({
        tipo: 'ok',
        texto: razaoSocial ? `CNPJ verificado na Receita Federal: ${razaoSocial}.` : 'CNPJ verificado na Receita Federal.',
      });
    }
    setVerificandoCnpjEdicao(false);
  };

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return fornecedores;
    return fornecedores.filter(
      (fornecedor) =>
        fornecedor.nome.toLowerCase().includes(termo) ||
        fornecedor.cnpj.toLowerCase().includes(termo) ||
        (fornecedor.email ?? '').toLowerCase().includes(termo)
    );
  }, [fornecedores, busca]);

  const totalComEmail = fornecedores.filter((f) => !!f.email).length;
  const totalComTelefone = fornecedores.filter((f) => !!f.telefone).length;

  return (
    <div className="space-y-8 text-foreground animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground mt-1">Cadastre e gerencie os fornecedores e parceiros da sua empresa.</p>
        </div>

        {/* MODAL ADICIONAR */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setNovoFornecedor(FORNECEDOR_VAZIO);
              setErrosNovo({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 font-bold shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Adicionar Novo Fornecedor
              </DialogTitle>
              <DialogDescription>Preencha as informações do fornecedor abaixo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nome do Fornecedor *</Label>
                <Input
                  placeholder="Ex: Distribuidora Alimentos Ltda"
                  value={novoFornecedor.nome}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })}
                  className={errosNovo.nome ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errosNovo.nome && <p className="text-xs text-destructive font-medium">{errosNovo.nome}</p>}
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <div className="relative">
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={novoFornecedor.cnpj}
                    maxLength={18}
                    onChange={(e) => {
                      setNovoFornecedor({ ...novoFornecedor, cnpj: formatarCNPJ(e.target.value) });
                      setAvisoCnpjNovo(null);
                    }}
                    onBlur={handleVerificarCnpjNovo}
                    className={errosNovo.cnpj ? 'border-destructive focus-visible:ring-destructive pr-9' : 'pr-9'}
                  />
                  {verificandoCnpjNovo && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errosNovo.cnpj && <p className="text-xs text-destructive font-medium">{errosNovo.cnpj}</p>}
                {!errosNovo.cnpj && avisoCnpjNovo && (
                  <p className={`text-xs font-medium ${avisoCnpjNovo.tipo === 'ok' ? 'text-green-600' : 'text-orange-600'}`}>
                    {avisoCnpjNovo.texto}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={novoFornecedor.telefone}
                  maxLength={15}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, telefone: formatarTelefone(e.target.value) })}
                  className={errosNovo.telefone ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errosNovo.telefone && <p className="text-xs text-destructive font-medium">{errosNovo.telefone}</p>}
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="contato@fornecedor.com"
                  value={novoFornecedor.email}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, email: e.target.value })}
                  className={errosNovo.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errosNovo.email && <p className="text-xs text-destructive font-medium">{errosNovo.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  placeholder="Rua, número, bairro, cidade - UF"
                  value={novoFornecedor.endereco}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, endereco: e.target.value })}
                />
              </div>
              {/* 🟢 NOVO: campo opcional — categorias de itens que o fornecedor fornece */}
              <div className="space-y-2 sm:col-span-2">
                <Label>Categorias fornecidas <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  placeholder="Ex: Bebidas, Higiene, Limpeza"
                  value={novoFornecedor.categoriasFornecidas || ''}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, categoriasFornecidas: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Separe por vírgula. Deixe em branco se não quiser categorizar.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={salvandoNovo}>
                Cancelar
              </Button>
              <Button onClick={handleAdicionarFornecedor} disabled={salvandoNovo} className="font-bold">
                {salvandoNovo ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Adicionar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL EDITAR */}
        <Dialog
          open={dialogEditOpen}
          onOpenChange={(open) => {
            setDialogEditOpen(open);
            if (!open) setErrosEdicao({});
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" /> Editar Fornecedor
              </DialogTitle>
              <DialogDescription>Atualize os dados do fornecedor abaixo.</DialogDescription>
            </DialogHeader>
            {fornecedorEditando && (
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={fornecedorEditando.nome}
                    onChange={(e) => setFornecedorEditando({ ...fornecedorEditando, nome: e.target.value })}
                    className={errosEdicao.nome ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {errosEdicao.nome && <p className="text-xs text-destructive font-medium">{errosEdicao.nome}</p>}
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <div className="relative">
                    <Input
                      value={fornecedorEditando.cnpj}
                      maxLength={18}
                      onChange={(e) => {
                        setFornecedorEditando({ ...fornecedorEditando, cnpj: formatarCNPJ(e.target.value) });
                        setAvisoCnpjEdicao(null);
                      }}
                      onBlur={handleVerificarCnpjEdicao}
                      className={errosEdicao.cnpj ? 'border-destructive focus-visible:ring-destructive pr-9' : 'pr-9'}
                    />
                    {verificandoCnpjEdicao && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {errosEdicao.cnpj && <p className="text-xs text-destructive font-medium">{errosEdicao.cnpj}</p>}
                  {!errosEdicao.cnpj && avisoCnpjEdicao && (
                    <p className={`text-xs font-medium ${avisoCnpjEdicao.tipo === 'ok' ? 'text-green-600' : 'text-orange-600'}`}>
                      {avisoCnpjEdicao.texto}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={fornecedorEditando.telefone}
                    maxLength={15}
                    onChange={(e) =>
                      setFornecedorEditando({ ...fornecedorEditando, telefone: formatarTelefone(e.target.value) })
                    }
                    className={errosEdicao.telefone ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {errosEdicao.telefone && <p className="text-xs text-destructive font-medium">{errosEdicao.telefone}</p>}
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={fornecedorEditando.email}
                    onChange={(e) => setFornecedorEditando({ ...fornecedorEditando, email: e.target.value })}
                    className={errosEdicao.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {errosEdicao.email && <p className="text-xs text-destructive font-medium">{errosEdicao.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={fornecedorEditando.endereco ?? ''}
                    onChange={(e) => setFornecedorEditando({ ...fornecedorEditando, endereco: e.target.value })}
                  />
                </div>
                {/* 🟢 NOVO: campo opcional — categorias de itens que o fornecedor fornece */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>Categorias fornecidas <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    placeholder="Ex: Bebidas, Higiene, Limpeza"
                    value={fornecedorEditando.categoriasFornecidas ?? ''}
                    onChange={(e) => setFornecedorEditando({ ...fornecedorEditando, categoriasFornecidas: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogEditOpen(false)} disabled={salvandoEdicao}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao} disabled={salvandoEdicao} className="font-bold">
                {salvandoEdicao ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{fornecedores.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Fornecedores cadastrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{totalComEmail}</p>
              <p className="text-sm text-muted-foreground mt-1">Com e-mail cadastrado</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{totalComTelefone}</p>
              <p className="text-sm text-muted-foreground mt-1">Com telefone cadastrado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5 text-primary" /> Buscar Fornecedores
          </CardTitle>
          <CardDescription>Filtre por nome, CNPJ ou e-mail.</CardDescription>
          <div className="relative flex-1 pt-2">
            <Search className="absolute left-3 top-1/2 mt-1 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Carregando fornecedores...</p>
            </div>
          ) : erroCarregamento ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <p className="font-bold">Não foi possível carregar os fornecedores</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Verifique sua conexão com o servidor e tente novamente.
              </p>
              <Button variant="outline" onClick={carregarFornecedores} className="mt-2">
                <RefreshCcw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedoresFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16">
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <div className="p-3 rounded-full bg-muted">
                          <Truck className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-foreground">
                          {fornecedores.length === 0 ? 'Nenhum fornecedor cadastrado' : 'Nenhum fornecedor encontrado'}
                        </p>
                        <p className="text-sm max-w-xs">
                          {fornecedores.length === 0
                            ? 'Clique em "Novo Fornecedor" para começar a cadastrar.'
                            : 'Tente ajustar os termos da sua busca.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  fornecedoresFiltrados.map((fornecedor) => {
                    const telefoneInfo = analisarTelefoneExibicao(fornecedor.telefone);
                    return (
                    <TableRow key={fornecedor.id} className="hover:bg-muted/40">
                      <TableCell className="font-bold">{fornecedor.nome}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{fornecedor.cnpj}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="space-y-1">
                          {telefoneInfo.texto && (
                            <div
                              className={`flex items-center gap-1.5 ${telefoneInfo.suspeito ? 'text-orange-600 font-medium' : ''}`}
                              title={telefoneInfo.suspeito ? 'Número fora do padrão (esperado DDD + 8 ou 9 dígitos). Abra a edição para corrigir.' : undefined}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {telefoneInfo.texto}
                              {telefoneInfo.suspeito && <AlertTriangle className="h-3.5 w-3.5" />}
                            </div>
                          )}
                          {fornecedor.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" /> {fornecedor.email}
                            </div>
                          )}
                          {!telefoneInfo.texto && !fornecedor.email && '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[220px]">
                        {fornecedor.endereco ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="truncate">{fornecedor.endereco}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                        {/* 🟢 NOVO: categorias fornecidas, se cadastradas */}
                        {fornecedor.categoriasFornecidas && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {fornecedor.categoriasFornecidas.split(',').map((cat) => cat.trim()).filter(Boolean).map((cat) => (
                              <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(fornecedor)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExcluirFornecedor(fornecedor.id, fornecedor.nome)}
                            disabled={excluindoId === fornecedor.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {excluindoId === fornecedor.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );})
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}