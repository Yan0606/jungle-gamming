# Arquitetura

## Stack

React, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Tailwind CSS, componentes no padrão shadcn/ui (Radix + `class-variance-authority`), MSW, Socket.IO client e `@mswjs/socket.io-binding`, Playwright e Lighthouse.

Os mocks participam do bundle de demonstração. Componentes e o cliente Axios não devolvem dados fictícios: toda leitura e escrita passa por `/api`.

## Contratos REST

Base: `/api`. Autenticação: `Authorization: Bearer`. Visitante: `x-guest-id`. Cenário: `x-scenario`. Pedido: `Idempotency-Key`.

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | `/auth/register` | Cria conta ou 409 se o e-mail existe |
| POST | `/auth/login` | Token de sessão |
| GET | `/auth/session` | Usuário ou `null`; 401 se o token expirou |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/nfts` | Lista com `q`, `categoria`, `rede`, `min`, `max`, `ordem`, `pagina`, `aba` |
| GET | `/nfts/:id` | Detalhe ou 404 |
| GET/POST/DELETE | `/favorites` e `/favorites/:id` | Favoritos do usuário autenticado |
| GET | `/cart` | Cotação do carrinho |
| POST/PATCH/DELETE | `/cart/items` | Inclusão, quantidade e remoção |
| POST/DELETE | `/cart/coupon` | Cupom `KURIO10`, inválido ou expirado |
| POST | `/quote` | Recalcula taxas. `accept: true` grava o preço vigente nos itens |
| POST | `/orders` | Cria pedido pendente de forma idempotente |
| GET | `/orders` e `/orders/:id` | Lista e recibo do usuário |
| GET/PATCH | `/profile` | Dados, bio e avatar |
| POST | `/profile/password` | Troca de senha |
| GET/POST | `/wallets` | Consulta e cadastro/edição |
| POST | `/wallets/:id/connection` | `connect`, `refuse` ou `disconnect` |

Erros usam `{ error, code, fields? }` com 400, 401, 404, 409, 422 e 500. Valores em ETH trafegam como string decimal e são calculados com inteiros na escala de 1e8.

A mesma `Idempotency-Key` com o mesmo conteúdo devolve o pedido existente. A mesma chave com conteúdo diferente responde 409.

## Eventos

Transporte: Socket.IO no mesmo origin, apenas websocket, interceptado pelo MSW via `@mswjs/socket.io-binding`. Limitação do binding: sem salas, namespaces ou broadcast nativo. O mock emite para a conexão que se identificou.

| Evento | Carga |
| --- | --- |
| `nft.updated` | `nftId`, `version`, `priceEth`, disponibilidade |
| `order.updated` | `orderId`, `userId`, `version`, `status` |

O cliente ignora versão menor ou igual à última aplicada. Evento de pedido de outro usuário é descartado no mock. Ao reconectar, o cliente reenvia `identify` e invalida carrinho, catálogo e pedido.

## Sessão, carrinho e cache

O token fica em `sessionStorage`. A senha é guardada só como SHA-256 com sal fixo de demonstração, nunca em claro. Logout limpa o token e o cache do TanStack Query.

O carrinho do visitante usa `x-guest-id` e é mesclado na conta no login. Estado de mocks persiste em `localStorage` (`kurio.db`) para sobreviver ao refresh. O reset recria o cenário inicial.

Query: `staleTime` de 15s, uma nova tentativa em consultas, nenhuma em mutations. A chave da query do catálogo inclui os filtros, então respostas de outra busca não sobrescrevem a atual. Favoritar é otimista e desfaz o cache se a mutation falha.

A cotação desatualizada bloqueia a confirmação até o colecionador aceitar os novos preços. O recibo guarda o snapshot do pedido. Estoque é reservado na criação; se o pagamento é recusado, a disponibilidade volta. O carrinho só perde as quantidades compradas quando o pedido é confirmado.

## Desvios do Figma

- As quatro artes enviadas (`Frame 136`, `NFT Artwork 04`, `05` e `10`) se repetem no catálogo. O arquivo do Figma não pôde ser exportado pela integração.
- Contagens de filtro saem da API, então não repetem os números estáticos do frame.
- O subtítulo do hero segue o texto visível no canvas: “Descubra NFTs selecionados de criadores emergentes e consagrados…”
- A família tipográfica do arquivo não abre no modo de visualização. A interface usa Inter, no lugar de Outfit, porque o texto do canvas é um grotesco.
- Login, cadastro e confirmação seguem a estrutura de modal do arquivo, em rotas próprias para acesso direto.
- Perfil, carteiras e confirmação no mobile reaproveitam o layout da conta, porque não há frame específico.
- Newsletter, estúdio do criador e links editoriais não simulam sucesso.
