# Kurio — Marketplace de NFTs

Implementação do desafio frontend da Jungle Gaming: marketplace de NFTs com descoberta, compra simulada e conta do colecionador. O layout segue o arquivo [Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=2-2) (marca Kurio).

## Setup

```bash
npm install
npm run dev
```

A aplicação sobe em `http://127.0.0.1:5173` com MSW ativo. Não há backend externo.

Variável opcional, em `.env` (veja `env.example`):

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `VITE_ENABLE_MSW` | ativo | `false` desliga os mocks |

## Credenciais fictícias

| E-mail | Senha |
| --- | --- |
| `ana@kurio.dev` | `coleciona123` |
| `bruno@kurio.dev` | `coleciona123` |

Cupom válido: `KURIO10` (10%). `EXPIRADO` simula cupom vencido. Qualquer outro código é inválido.

## Cenários e reset

O botão **Simulação**, no canto inferior esquerdo, troca o cenário e recarrega a página. O valor fica em `localStorage` na chave `kurio.scenario`.

| Cenário | Efeito |
| --- | --- |
| `lento` | Respostas em cerca de 1,4s, para ver o skeleton |
| `vazio` | Catálogo sem resultados |
| `erro-catalogo` | HTTP 500 no catálogo |
| `offline` | Falha de rede |
| `sessao-expirada` | Sessão responde 401 |
| `favorito-falha` | Mutation de favorito falha |
| `pagamento-recusado` | Pedido termina recusado |
| `timeout-pedido` | A criação passa do timeout do Axios; a mesma chave recupera o pedido |
| `pedido-pendente` | Pedido fica pendente até a resolução manual na tela do recibo |
| `preco-muda` | No pagamento, o preço do primeiro item muda e a cotação pede nova confirmação |

**Resetar dados** apaga o estado persistido e volta ao cenário conhecido (dois usuários, catálogo original, carrinho vazio).

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test:e2e
npm run lighthouse
```

O preview e o deploy na Vercel reescrevem todas as rotas para `index.html`, então acesso direto e refresh funcionam.

## Contratos

Os contratos REST, eventos Socket.IO, sessão, carrinho, cache e limitações estão em `ARCHITECTURE.md`.
