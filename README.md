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
- 📱 **PWA** — instalável na tela inicial do celular.

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

A URL base da API está definida em `src/app/services/api.ts`:

```ts
const API_BASE_URL = 'https://smartstock-backend-j7em.onrender.com';
```

Para apontar para um backend local durante o desenvolvimento, altere esse valor para `http://localhost:8080` (ou a porta configurada no backend).

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

O login retorna um token JWT, armazenado no `localStorage` e enviado automaticamente em toda requisição subsequente via header `Authorization: Bearer <token>` (configurado nos interceptors do Axios em `services/api.ts`). O contexto `AuthContext` expõe o estado de autenticação para toda a aplicação e trata a expiração de sessão redirecionando para a tela de login.

---

## 📄 Licença

Projeto acadêmico/comercial privado. Todos os direitos reservados.
