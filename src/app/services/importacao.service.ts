import api from './api';


export const importacaoService = {
  async importarCsv(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('ficheiro', file);

    const response = await api.post('/importacao/produtos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  },

  async importarXmlNFe(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('ficheiro', file);

    const response = await api.post('/importacao/xml-direto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  },

  // Escolhe a rota certa sozinho, com base na extensão do arquivo — mesmo
  // critério usado na tela de Importação.
  async importar(file: File): Promise<string> {
    const ehCsv = file.name.toLowerCase().endsWith('.csv');
    return ehCsv ? this.importarCsv(file) : this.importarXmlNFe(file);
  },
};