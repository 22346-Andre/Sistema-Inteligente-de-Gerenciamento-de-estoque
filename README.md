# 📦 SmartStock — Frontend

![React](https://img.shields.io/badge/React-18.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

Frontend do **SmartStock**, sistema de gestão inteligente de estoque, vendas e fornecedores para pequenas e médias empresas. Interface web responsiva (desktop e mobile), consumindo a [API REST do backend](https://github.com/22346-Andre/Sistema-Inteligente-de-Gerenciamento-de-Estoque-para-pequenas-e-m-dias-empresas) via HTTPS.

🔗 **Aplicação em produção:** [frontendrepository-ebon.vercel.app](https://frontendrepository-ebon.vercel.app)

---

## ✨ Principais Funcionalidades

- 🖥️ **Dashboard** com indicadores em tempo real (capital imobilizado, giro de estoque, itens críticos) e **Curva ABC** configurável por faturamento, lucratividade ou giro de vendas.
- 🧾 **Scanner / PDV** com leitura de código de barras via câmera do dispositivo ou leitor USB, carrinho de venda, registro de entrada/saída/perda de estoque, emissão de cupom e DANFE simplificados.
- 💳 **Cobrança via PIX** (QR Code + Copia e Cola, gerado localmente) e **recibo automático por WhatsApp** após a venda.
- 📇 **Gestão de Produtos** com listagem paginada, busca e filtro por categoria, e importação em massa via planilha CSV ou XML de Nota Fiscal.
- 🚚 **Gestão de Fornecedores**, com consulta automática de dados via CNPJ e categorização de itens fornecidos.
- 💰 **Contas a Receber (Fiado)**, com cobrança automatizada via WhatsApp ou PIX.
- 🧠 **Sugestões de Compra** inteligentes, com cálculo de urgência combinando estoque, giro de vendas e prazo do fornecedor.
- 👥 **Gestão de equipe** com perfis de acesso (Administrador / Caixa) e recuperação de senha por e-mail.
- 🎨 **4 temas visuais**: claro, escuro, Dracula e alto contraste.
- 📱 **PWA** — instalável na tela inicial do celular, com manifesto e ícone publicados em `public/`.

---

## 💻 Tecnologias Utilizadas

| Tecnologia | Função |
|---|---|
| [React 18](https://react.dev/) + TypeScript | Biblioteca principal de UI, com tipagem estática em todo o projeto |
| [Vite](https://vitejs.dev/) | Build tool e servidor de desenvolvimento |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilização utilitária, com suporte aos 4 temas via CSS custom variants |
| [React Router 7](https://reactrouter.com/) | Roteamento client-side (SPA) |
| [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) | Componentes acessíveis (Dialog, Tabs, Select, etc.) |
| [Recharts](https://recharts.org/) | Gráficos do Dashboard |
| [html5-qrcode](https://github.com/mebjas/html5-qrcode) | Leitura de código de barras via câmera |
| [qrcode.react](https://github.com/zpao/qrcode.react) | Geração do QR Code de cobrança PIX |
| [Axios](https://axios-http.com/) | Cliente HTTP, com interceptors para JWT e tratamento centralizado de erros |
| [Sonner](https://sonner.emilkowal.ski/) | Notificações toast |
| [date-fns](https://date-fns.org/) | Formatação de datas (padrão pt-BR) |

---

## 🚀 Rodando o projeto localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18 ou superior
- O [backend](https://github.com/22346-Andre/Sistema-Inteligente-de-Gerenciamento-de-Estoque-para-pequenas-e-m-dias-empresas) rodando (local ou apontando para a instância em produção)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/22346-Andre/frontendrepository.git
cd frontendrepository

# 2. Instale as dependências
npm install

# 3. Rode o servidor de desenvolvimento
npm run dev
```

A aplicação sobe por padrão em `http://localhost:5173`.

### Build de produção

```bash
npm run build
```

Gera os arquivos estáticos otimizados em `dist/`, prontos para deploy (Vercel, Netlify, ou qualquer servidor de arquivos estáticos).

### Configurando a URL da API

O desenvolvimento local usa `VITE_API_BASE_URL` definido em `.env.development` (por padrão, `http://localhost:8080`). A aplicação não usa fallback para a API de produção: configure a variável antes de iniciar ou compilar.

No Vercel, configure `VITE_API_BASE_URL` em **Settings > Environment Variables** para cada ambiente de deploy. Para produção, use a URL HTTPS do backend de produção; configure Preview com o backend de homologação quando disponível. Mantenha a origem do backend alinhada à diretiva `connect-src` da CSP em `vercel.json`.

Execute `npm run typecheck` para a checagem TypeScript e `npm test` para os testes do frontend.

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── pages/         # Telas da aplicação (uma por rota)
│   ├── components/    # Componentes reutilizáveis (inclui components/ui, base shadcn/ui)
│   ├── services/      # Camada de acesso à API (um arquivo por domínio: produto, fornecedor, pix, etc.)
│   ├── contexts/       # Contextos globais (autenticação, tema)
│   ├── hooks/          # Hooks customizados compartilhados
│   └── routes.tsx      # Definição de todas as rotas
└── styles/
    ├── index.css        # Entrada principal do Tailwind, define as variantes de tema
    ├── theme.css         # Paletas de cor de cada tema
    └── tailwind.css      # Configuração do Tailwind
```

---

## 🔐 Autenticação

O login retorna um token JWT, atualmente armazenado no `localStorage` e enviado em `Authorization: Bearer <token>`. Isso mantém a sessão acessível a scripts da página e, portanto, não elimina o risco de XSS. A migração para cookie `HttpOnly` precisa ser feita junto ao backend, incluindo `Secure`/`SameSite`, CORS com credenciais e proteção CSRF; não é possível tornar um cookie `HttpOnly` apenas pelo frontend. O `AuthContext` valida os dados persistidos e remove sessões corrompidas.

---

## 📄 Licença

Projeto acadêmico/comercial privado. Todos os direitos reservados.
