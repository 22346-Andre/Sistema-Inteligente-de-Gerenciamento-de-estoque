import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Upload, FileText, FileSpreadsheet, FileCode2, CheckCircle2, AlertTriangle, Info, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Importacao() {
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xml'))) {
      setArquivoSelecionado(file);
    } else {
      toast.error('Formato inválido! Selecione apenas arquivos .CSV ou .XML');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoSelecionado(file);
    }
  };

  const handleImportar = async () => {
    if (!arquivoSelecionado) {
      toast.error('Por favor, selecione um arquivo primeiro');
      return;
    }

    setImportando(true);

    try {
      const formData = new FormData();
      formData.append('ficheiro', arquivoSelecionado);

      const nomeArquivo = arquivoSelecionado.name.toLowerCase();
      let response;

      // 🟢 SE FOR CSV: Vai para a rota original de Planilhas
      if (nomeArquivo.endsWith('.csv')) {
        response = await api.post('/importacao/produtos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.success('Planilha Importada com Sucesso!', {
          description: response.data,
          duration: 8000 
        });

      // 🟢 SE FOR XML: Usa a rota unificada (Lê e Salva de uma vez)
      } else if (nomeArquivo.endsWith('.xml')) {
        response = await api.post('/importacao/xml-direto', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.success('Nota Fiscal Processada e Salva!', {
          description: response.data,
          duration: 8000 
        });
      } else {
        throw new Error('Formato de arquivo não suportado pelo sistema.');
      }
      
      handleRemoverArquivo();
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      
      //  Proteção contra ecrã preto
      let msgErro = 'Erro desconhecido ao processar o arquivo no servidor.';
      if (error.response && error.response.data) {
          if (typeof error.response.data === 'string') {
              msgErro = error.response.data;
          } else if (error.response.data.message) {
              msgErro = error.response.data.message;
          } else if (error.response.data.error) {
              msgErro = "Erro " + error.response.status + ": " + error.response.data.error;
          }
      } else if (error.message) {
          msgErro = error.message;
      }

      toast.error('Falha na Importação', { description: msgErro });
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
          <p className="text-muted-foreground mt-1">Alimente o seu estoque em massa através de Planilhas CSV ou Notas Fiscais Eletrónicas (XML da SEFAZ).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <Card className="lg:col-span-5 shadow-lg border-border/50 overflow-hidden">
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
                Suporta planilhas padrão (.csv) e espelhos da SEFAZ (.xml)
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
                      {(arquivoSelecionado.size / 1024).toFixed(2)} KB • {arquivoSelecionado.name.endsWith('.csv') ? 'Planilha Excel/CSV' : 'Nota Fiscal XML'}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={handleRemoverArquivo} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-full h-8 w-8">
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
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div> Processando no Servidor...</>
              ) : (
                <>Iniciar Importação <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 shadow-lg border-border/50">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Info className="h-5 w-5 text-blue-500" /> Instruções e Formatos
            </CardTitle>
            <CardDescription>Como preparar os seus dados para o sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <FileSpreadsheet className="h-5 w-5" />
                <h3 className="font-bold text-lg text-foreground">Importação via Planilha (CSV)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ideal para cadastrar ou atualizar múltiplos produtos de uma só vez. O arquivo deve ter os cabeçalhos exatos na primeira linha e estar separado por <strong>ponto e vírgula (;)</strong>.
              </p>
              
              <div className="bg-muted border border-border rounded-xl p-4 overflow-x-auto">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Exemplo de Estrutura</p>
                <div className="font-mono text-sm whitespace-nowrap space-y-1">
                  <div className="text-primary font-bold">nome;descricao;codigoBarras;categoria;precoCusto;precoVenda;quantidade;quantidadeMinima;ncm;unidade;fornecedorId</div>
                  <div className="text-foreground">Arroz 5kg;Saco de arroz;789123;Alimentos;22.50;28.90;50;10;12345;UN;1</div>
                  <div className="text-foreground">Feijão 1kg;Feijao preto;789124;Alimentos;7.20;9.90;30;5;12346;UN;1</div>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Casas decimais com ponto (Ex: 10.50)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Produtos com mesmo nome somam estoque</li>
              </ul>
            </div>

            <div className="h-px w-full bg-border" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-orange-500">
                <FileCode2 className="h-5 w-5" />
                <h3 className="font-bold text-lg text-foreground">Importação de NF-e (XML SEFAZ)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Faça o upload do espelho XML fornecido pelo seu fornecedor ou baixado do portal da SEFAZ. O sistema irá ler as Tags fiscais automaticamente.
              </p>
              
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    <p className="font-bold">O que o sistema faz com o XML?</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>Extrai o Código de Barras (cEAN), Nome e NCM.</li>
                      <li>Atualiza a quantidade em estoque com base na nota.</li>
                      <li>Atualiza o seu <strong>Preço de Custo</strong> para a precisão exata da compra.</li>
                      <li>Calcula automaticamente um preço de venda sugerido (+50%) para novos produtos.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}