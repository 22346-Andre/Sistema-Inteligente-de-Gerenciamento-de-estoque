import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Loader2,
  PackageCheck,
  PackagePlus,
  MessageCircleWarning,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { InstrucoesButton } from '../components/InstrucoesButton';

const TAMANHO_MAXIMO_MB = 15;
const EXTENSOES_ACEITAS = ['.csv', '.xml'];

type StatusResultado = 'sucesso' | 'duplicado' | 'erro';

interface ResultadoImportacao {
  status: StatusResultado;
  titulo: string;
  mensagem: string;
  arquivo: string;
}

/**
 * Extrai uma mensagem legível dos formatos de erro que a API pode devolver:
 * - string pura (é o que o ImportacaoController retorna hoje: BAD_REQUEST/CONFLICT/
 *   INTERNAL_SERVER_ERROR com .body(String))
 * - { erro: string, detalhes?: {...} } (formato do TratadorDeErros global, usado se
 *   a exceção não for capturada explicitamente no controller)
 * - fallback para error.message (erro de rede, timeout, CORS, etc.)
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
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }

  return error?.message || fallback;
}

function arquivoValido(file: File): string | null {
  const nome = file.name.toLowerCase();
  const extensaoValida = EXTENSOES_ACEITAS.some((ext) => nome.endsWith(ext));
  if (!extensaoValida) {
    return 'Formato inválido! Selecione apenas arquivos .CSV ou .XML';
  }
  if (file.size === 0) {
    return 'O arquivo selecionado está vazio.';
  }
  if (file.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    return `O arquivo excede o limite de ${TAMANHO_MAXIMO_MB}MB.`;
  }
  return null;
}

/** Quebra o relatório de texto do backend em linhas para uma exibição mais legível. */
function RelatorioFormatado({ texto }: { texto: string }) {
  const linhas = texto.split('\n').filter((l) => l.trim() !== '');
  return (
    <div className="space-y-1.5">
      {linhas.map((linha, i) => {
        const ehAviso = /^avisos/i.test(linha.trim());
        const ehItem = linha.trim().startsWith('-');
        return (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              ehAviso ? 'font-bold text-orange-600 mt-3' : ehItem ? 'text-foreground pl-2' : 'font-semibold'
            }`}
          >
            {linha}
          </p>
        );
      })}
    </div>
  );
}

export default function Importacao() {
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const selecionarArquivo = (file: File) => {
    const erro = arquivoValido(file);
    if (erro) {
      toast.error(erro);
      return;
    }
    setResultado(null);
    setArquivoSelecionado(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) selecionarArquivo(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selecionarArquivo(file);
  };

  const handleImportar = async () => {
    if (!arquivoSelecionado) {
      toast.error('Por favor, selecione um arquivo primeiro');
      return;
    }

    setImportando(true);
    setResultado(null);

    const nomeArquivo = arquivoSelecionado.name;
    const nomeArquivoLower = nomeArquivo.toLowerCase();
    const ehCsv = nomeArquivoLower.endsWith('.csv');
    const rota = ehCsv ? '/importacao/produtos' : '/importacao/xml-direto';
    const tituloSucesso = ehCsv ? 'Planilha Importada com Sucesso!' : 'Nota Fiscal Processada e Salva!';

    try {
      const formData = new FormData();
      formData.append('ficheiro', arquivoSelecionado);

      const response = await api.post(rota, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResultado({
        status: 'sucesso',
        titulo: tituloSucesso,
        mensagem: typeof response.data === 'string' ? response.data : 'Importação concluída com sucesso.',
        arquivo: nomeArquivo,
      });
      toast.success(tituloSucesso);
      handleRemoverArquivo();
    } catch (error: any) {
      const status = error?.response?.status;
      const duplicado = status === 409;
      const mensagem = extrairMensagemErro(
        error,
        'Erro desconhecido ao processar o arquivo no servidor.'
      );

      setResultado({
        status: duplicado ? 'duplicado' : 'erro',
        titulo: duplicado ? 'Nota Fiscal já importada' : 'Falha na Importação',
        mensagem,
        arquivo: nomeArquivo,
      });

      toast.error(duplicado ? 'Nota Fiscal já importada' : 'Falha na Importação', {
        description: mensagem,
      });
    } finally {
      setImportando(false);
    }
  };

  const handleRemoverArquivo = () => {
    setArquivoSelecionado(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const renderIconeArquivo = () => {
    if (!arquivoSelecionado) return <FileText className="h-8 w-8 text-muted-foreground" />;
    if (arquivoSelecionado.name.toLowerCase().endsWith('.csv')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    }
    return <FileCode2 className="h-8 w-8 text-orange-500" />;
  };

  return (
    <div className="space-y-8 text-foreground animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Importação de Dados</h1>
          <p className="text-muted-foreground mt-1">Alimente o seu estoque em massa através de Planilhas CSV ou Notas Fiscais Eletrônicas (XML da SEFAZ).</p>
        </div>
        <InstrucoesButton
          titulo="Instruções e Formatos"
          descricao="Como preparar os seus dados para o sistema."
          label="Ver instruções e formatos"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <FileSpreadsheet className="h-5 w-5" />
              <h3 className="font-bold text-base text-foreground">Importação via Planilha (CSV)</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Ideal para cadastrar ou atualizar múltiplos produtos de uma só vez. O sistema aceita separador por <strong>vírgula (,)</strong> ou <strong>ponto e vírgula (;)</strong> — detectado automaticamente pela primeira linha do arquivo.
            </p>

            <div className="bg-muted border border-border rounded-xl p-4 overflow-x-auto">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Exemplo de Estrutura</p>
              <div className="font-mono text-xs whitespace-nowrap space-y-1">
                <div className="text-primary font-bold">nome;descricao;codigoBarras;categoria;precoCusto;precoVenda;quantidade;quantidadeMinima;ncm;unidade;fornecedorNome;fornecedorCnpj;icms;ipi;pis;cofins</div>
                <div className="text-foreground">Arroz 5kg;Saco de arroz;789123;Alimentos;22.50;28.90;50;10;12345;UN;Distribuidora Silva;11.222.333/0001-81;18;0;1.65;7.6</div>
                <div className="text-foreground">Feijão 1kg;Feijao preto;789124;Alimentos;7.20;9.90;30;5;12346;UN;Distribuidora Silva;;;;;</div>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-2 text-muted-foreground mt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Casas decimais com ponto (Ex: 10.50)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Produto existente (por código de barras ou nome) soma estoque</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Linhas com número de colunas diferente do cabeçalho são ignoradas e reportadas</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> fornecedorNome e/ou fornecedorCnpj — ambos opcionais e independentes entre si</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> icms, ipi, pis, cofins — opcionais, em % (Ex: 18 = 18%). Se a linha não trouxer nenhum, o produto fica sem imposto cadastrado (você pode adicionar depois pela tela de Produtos)</li>
            </ul>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex gap-3">
                <PackagePlus className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-blue-800 dark:text-blue-200">
                  <p className="font-bold">Fornecedor novo? O sistema cadastra sozinho</p>
                  <p className="opacity-90">
                    Você não precisa mais saber o ID do fornecedor. Informe o <strong>nome</strong>, o <strong>CNPJ</strong>, ou os dois — o sistema procura um fornecedor já cadastrado com esses dados e, se não achar, <strong>cadastra automaticamente</strong>, do mesmo jeito que já faz com produtos novos. O CNPJ é a chave mais confiável (evita cadastrar o mesmo fornecedor duas vezes com nomes escritos diferente); se você só informar o nome, o sistema cria o fornecedor mesmo assim e avisa no relatório que o CNPJ precisa ser completado depois em "Fornecedores".
                  </p>
                  <p className="opacity-90">
                    O CNPJ informado é conferido pelo dígito verificador (não só a quantidade de números). Se vier errado ou inventado, a linha não é rejeitada — o produto é importado do mesmo jeito, só que o fornecedor é resolvido pelo nome, e o relatório final avisa qual CNPJ foi ignorado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-500">
              <FileCode2 className="h-5 w-5" />
              <h3 className="font-bold text-base text-foreground">Importação de NF-e (XML SEFAZ)</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Faça o upload do espelho XML fornecido pelo seu fornecedor ou baixado do portal da SEFAZ. O sistema lê a nota inteira e já salva os produtos automaticamente em uma única etapa.
            </p>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-orange-800 dark:text-orange-200">
                  <p className="font-bold">O que o sistema faz com o XML?</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Extrai o Código de Barras (cEAN), Nome e NCM de cada item.</li>
                    <li>Identifica o fornecedor pela tag &lt;emit&gt; e cadastra automaticamente se ainda não existir.</li>
                    <li>Atualiza a quantidade em estoque com base na nota.</li>
                    <li>Atualiza o seu <strong>Preço de Custo</strong> para a precisão exata da compra.</li>
                    <li>Calcula automaticamente um preço de venda sugerido (+50%) para novos produtos.</li>
                    <li>Registra os impostos (ICMS, IPI, PIS, COFINS) de cada item.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex gap-3">
                <PackagePlus className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-blue-800 dark:text-blue-200">
                  <p className="font-bold">Proteção contra reimportação</p>
                  <p className="opacity-90">
                    Cada NF-e é identificada pela sua chave de acesso. Se a mesma nota for enviada novamente, o sistema bloqueia o processamento para não duplicar o estoque.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </InstrucoesButton>
      </div>

      <div className="max-w-2xl mx-auto w-full">

        <Card className="shadow-lg border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5 text-primary" /> Área de Upload
            </CardTitle>
            <CardDescription>Arraste o seu documento ou selecione manualmente.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative group border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ease-in-out flex flex-col items-center justify-center min-h-[280px]
                ${dragOver
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className={`p-4 rounded-full bg-background border shadow-sm mb-4 transition-transform duration-300 ${dragOver ? 'scale-110 text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                <Upload className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold mb-1">Arraste seu arquivo aqui</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
                Suporta planilhas padrão (.csv) e espelhos da SEFAZ (.xml) até {TAMANHO_MAXIMO_MB}MB
              </p>

              <input ref={inputRef} type="file" accept=".csv,.xml" onChange={handleFileSelect} className="hidden" />
              <Button onClick={() => inputRef.current?.click()} variant="outline" className="relative z-10 rounded-full px-8 hover:bg-primary hover:text-primary-foreground transition-colors">
                Procurar no Computador
              </Button>
            </div>

            {arquivoSelecionado && (
              <div className="bg-card border border-border shadow-sm rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    {renderIconeArquivo()}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm truncate">{arquivoSelecionado.name}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {(arquivoSelecionado.size / 1024).toFixed(2)} KB • {arquivoSelecionado.name.toLowerCase().endsWith('.csv') ? 'Planilha Excel/CSV' : 'Nota Fiscal XML'}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={handleRemoverArquivo} disabled={importando} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-full h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleImportar}
              disabled={!arquivoSelecionado || importando}
              className="w-full h-12 text-base font-bold shadow-md transition-all"
              size="lg"
            >
              {importando ? (
                <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Processando no Servidor...</>
              ) : (
                <>Iniciar Importação <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>

            {resultado && (
              <div
                className={`rounded-xl p-4 border animate-in slide-in-from-bottom-4 ${
                  resultado.status === 'sucesso'
                    ? 'bg-green-500/10 border-green-500/20'
                    : resultado.status === 'duplicado'
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : 'bg-destructive/10 border-destructive/20'
                }`}
              >
                <div className="flex gap-3">
                  {resultado.status === 'sucesso' && <PackageCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                  {resultado.status === 'duplicado' && <MessageCircleWarning className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />}
                  {resultado.status === 'erro' && <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                  <div className="space-y-1 min-w-0">
                    <p
                      className={`font-bold text-sm ${
                        resultado.status === 'sucesso'
                          ? 'text-green-700 dark:text-green-400'
                          : resultado.status === 'duplicado'
                          ? 'text-orange-700 dark:text-orange-400'
                          : 'text-destructive'
                      }`}
                    >
                      {resultado.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{resultado.arquivo}</p>
                    {resultado.status === 'sucesso' ? (
                      <RelatorioFormatado texto={resultado.mensagem} />
                    ) : (
                      <p className="text-sm leading-relaxed">{resultado.mensagem}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}