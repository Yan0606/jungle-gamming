import { http, HttpResponse } from "msw";
import { CATEGORIES, NETWORKS, sha256 } from "@/mocks/catalog";
import {
  applyPriceChange,
  loadDatabase,
  mergeGuestCart,
  ownerId,
  publicUser,
  quoteCart,
  resetDatabase,
  syncCartPrices,
  saveDatabase,
  sessionUser,
  setOrderStatus,
} from "@/mocks/db";
import { bearer, fail, scenarioDelay, scenarioOf } from "@/mocks/http";
import { compareEth } from "@/lib/money";
import type { NetworkId, Order, SortId } from "@/types";

const PAGE_SIZE = 9;

function tokenOf(userId: string) {
  return `kurio.${userId}.${crypto.randomUUID()}`;
}

export const handlers = [
  http.post("/api/dev/reset", async () => {
    await resetDatabase();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    await scenarioDelay(scenarioOf(request));
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const fields: Record<string, string> = {};
    if (!body.name || body.name.trim().length < 2) fields.name = "Informe seu nome.";
    if (!body.email || !/^\S+@\S+\.\S+$/.test(body.email)) fields.email = "E-mail inválido.";
    if (!body.password || body.password.length < 8) fields.password = "A senha precisa de 8 caracteres.";
    if (Object.keys(fields).length) return fail(400, "Revise os campos.", "validation", fields);
    const db = await loadDatabase();
    if (db.users.some((user) => user.email.toLowerCase() === body.email!.toLowerCase())) {
      return fail(409, "Já existe um colecionador com este e-mail.", "conflict", { email: "E-mail já cadastrado." });
    }
    const user = {
      id: `user-${crypto.randomUUID()}`,
      name: body.name!.trim(),
      email: body.email!.trim(),
      passwordHash: await sha256(body.password!),
      bio: "",
    };
    db.users.push(user);
    const token = tokenOf(user.id);
    db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 8 });
    mergeGuestCart(db, request.headers.get("x-guest-id") ?? "", user.id);
    saveDatabase(db);
    return HttpResponse.json({ token, user: publicUser(user) });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    await scenarioDelay(scenarioOf(request));
    const body = (await request.json()) as { email?: string; password?: string };
    const fields: Record<string, string> = {};
    if (!body.email) fields.email = "Informe o e-mail.";
    if (!body.password) fields.password = "Informe a senha.";
    if (Object.keys(fields).length) return fail(400, "Revise os campos.", "validation", fields);
    const db = await loadDatabase();
    const user = db.users.find((item) => item.email.toLowerCase() === body.email!.toLowerCase());
    if (!user || user.passwordHash !== (await sha256(body.password!))) {
      return fail(401, "E-mail ou senha incorretos.", "unauthorized", { password: "Credenciais inválidas." });
    }
    const token = tokenOf(user.id);
    db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 8 });
    mergeGuestCart(db, request.headers.get("x-guest-id") ?? "", user.id);
    saveDatabase(db);
    return HttpResponse.json({ token, user: publicUser(user) });
  }),

  http.get("/api/auth/session", async ({ request }) => {
    const scenario = scenarioOf(request);
    if (scenario === "offline") return HttpResponse.error();
    await scenarioDelay(scenario);
    if (scenario === "sessao-expirada") return fail(401, "Sua sessão expirou.", "expired");
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user && bearer(request)) return fail(401, "Sessão inválida.", "unauthorized");
    return HttpResponse.json(user);
  }),

  http.post("/api/auth/logout", async ({ request }) => {
    const db = await loadDatabase();
    const token = bearer(request);
    db.sessions = db.sessions.filter((session) => session.token !== token);
    saveDatabase(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/nfts", async ({ request }) => {
    const scenario = scenarioOf(request);
    if (scenario === "offline") return HttpResponse.error();
    if (scenario === "erro-catalogo") return fail(500, "O catálogo está indisponível.", "transient");
    await scenarioDelay(scenario);
    const db = await loadDatabase();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const categories = (url.searchParams.get("categoria") ?? "").split(",").filter(Boolean);
    const networks = (url.searchParams.get("rede") ?? "").split(",").filter(Boolean);
    const min = url.searchParams.get("min");
    const max = url.searchParams.get("max");
    const ordem = (url.searchParams.get("ordem") ?? "recent") as SortId;
    const aba = url.searchParams.get("aba") ?? "todos";
    const page = Math.max(1, Number(url.searchParams.get("pagina") ?? "1"));

    let items = db.nfts.filter((nft) => {
      if (q && !`${nft.name} ${nft.creator}`.toLowerCase().includes(q)) return false;
      if (categories.length && !categories.includes(nft.category)) return false;
      if (networks.length && !networks.includes(nft.network)) return false;
      if (min && compareEth(nft.priceEth, min) < 0) return false;
      if (max && compareEth(nft.priceEth, max) > 0) return false;
      if (aba === "novos" && !nft.fresh) return false;
      if (aba === "alta" && !nft.trending) return false;
      return true;
    });

    const counts = {
      categories: Object.fromEntries(CATEGORIES.map((category) => [category.id, db.nfts.filter((nft) => nft.category === category.id).length])),
      networks: Object.fromEntries(NETWORKS.map((network) => [network.id, db.nfts.filter((nft) => nft.network === network.id).length])),
    };

    items = [...items].sort((a, b) => {
      if (ordem === "price-asc") return compareEth(a.priceEth, b.priceEth);
      if (ordem === "price-desc") return compareEth(b.priceEth, a.priceEth);
      if (ordem === "name") return a.name.localeCompare(b.name, "pt-BR");
      return b.createdAt.localeCompare(a.createdAt);
    });

    const total = items.length;
    const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    if (scenario === "vazio") return HttpResponse.json({ items: [], page: 1, pageSize: PAGE_SIZE, total: 0, counts });
    return HttpResponse.json({ items: slice, page, pageSize: PAGE_SIZE, total, counts });
  }),

  http.get("/api/nfts/:id", async ({ params, request }) => {
    const scenario = scenarioOf(request);
    if (scenario === "offline") return HttpResponse.error();
    await scenarioDelay(scenario);
    const db = await loadDatabase();
    const nft = db.nfts.find((item) => item.id === params.id);
    if (!nft) return fail(404, "NFT não encontrado.", "not-found");
    return HttpResponse.json(nft);
  }),

  http.get("/api/favorites", async ({ request }) => {
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para ver seus favoritos.", "unauthorized");
    return HttpResponse.json({ ids: db.favorites[user.id] ?? [] });
  }),

  http.post("/api/favorites/:id", async ({ params, request }) => {
    const scenario = scenarioOf(request);
    await scenarioDelay(scenario);
    if (scenario === "favorito-falha") return fail(500, "Não foi possível salvar o favorito.", "transient");
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para favoritar.", "unauthorized");
    const nft = db.nfts.find((item) => item.id === params.id);
    if (!nft) return fail(404, "NFT não encontrado.", "not-found");
    const ids = new Set(db.favorites[user.id] ?? []);
    ids.add(String(params.id));
    db.favorites[user.id] = [...ids];
    saveDatabase(db);
    return HttpResponse.json({ ids: db.favorites[user.id] });
  }),

  http.delete("/api/favorites/:id", async ({ params, request }) => {
    const scenario = scenarioOf(request);
    await scenarioDelay(scenario);
    if (scenario === "favorito-falha") return fail(500, "Não foi possível remover o favorito.", "transient");
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para alterar favoritos.", "unauthorized");
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== params.id);
    saveDatabase(db);
    return HttpResponse.json({ ids: db.favorites[user.id] });
  }),

  http.get("/api/cart", async ({ request }) => {
    await scenarioDelay(scenarioOf(request));
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    const network = (new URL(request.url).searchParams.get("rede") ?? "ethereum") as NetworkId;
    return HttpResponse.json(quoteCart(db, owner, network));
  }),

  http.post("/api/cart/items", async ({ request }) => {
    const body = (await request.json()) as { nftId?: string; editionId?: string; quantity?: number };
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    const nft = db.nfts.find((item) => item.id === body.nftId);
    if (!nft) return fail(404, "NFT não encontrado.", "not-found");
    const edition = nft.editions.find((item) => item.id === body.editionId) ?? nft.editions[0];
    const quantity = Math.floor(Number(body.quantity ?? 1));
    if (quantity < 1) return fail(400, "Quantidade inválida.", "validation", { quantity: "Informe ao menos 1." });
    if (edition.available < quantity) {
      return fail(409, "Edição sem unidades suficientes.", "availability", { quantity: `Disponível: ${edition.available}.` });
    }
    const cart = db.carts[owner] ?? { ownerId: owner, items: [] };
    const existing = cart.items.find((item) => item.nftId === nft.id && item.editionId === edition.id);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > edition.available) {
      return fail(409, "Essa quantidade passa do estoque da edição.", "availability");
    }
    if (existing) existing.quantity = nextQuantity;
    else cart.items.push({ nftId: nft.id, editionId: edition.id, quantity, unitPriceEth: nft.priceEth, priceVersion: nft.version });
    db.carts[owner] = cart;
    saveDatabase(db);
    return HttpResponse.json(quoteCart(db, owner));
  }),

  http.patch("/api/cart/items/:nftId", async ({ params, request }) => {
    const body = (await request.json()) as { editionId?: string; quantity?: number };
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    const cart = db.carts[owner];
    const item = cart?.items.find((entry) => entry.nftId === params.nftId && entry.editionId === body.editionId);
    if (!item) return fail(404, "Item não está no carrinho.", "not-found");
    const nft = db.nfts.find((entry) => entry.id === item.nftId)!;
    const edition = nft.editions.find((entry) => entry.id === item.editionId)!;
    const quantity = Math.floor(Number(body.quantity));
    if (quantity < 1) return fail(400, "Quantidade inválida.", "validation");
    if (quantity > edition.available) return fail(409, "Edição sem unidades suficientes.", "availability");
    item.quantity = quantity;
    saveDatabase(db);
    return HttpResponse.json(quoteCart(db, owner));
  }),

  http.delete("/api/cart/items/:nftId", async ({ params, request }) => {
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    const editionId = new URL(request.url).searchParams.get("editionId");
    const cart = db.carts[owner];
    if (cart) cart.items = cart.items.filter((item) => !(item.nftId === params.nftId && item.editionId === editionId));
    saveDatabase(db);
    return HttpResponse.json(quoteCart(db, owner));
  }),

  http.post("/api/cart/coupon", async ({ request }) => {
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim().toUpperCase() ?? "";
    if (code === "EXPIRADO") return fail(422, "Este cupom expirou.", "expired-coupon");
    if (code !== "KURIO10") return fail(422, "Cupom inválido.", "invalid-coupon");
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    const cart = db.carts[owner] ?? { ownerId: owner, items: [] };
    cart.coupon = code;
    db.carts[owner] = cart;
    saveDatabase(db);
    return HttpResponse.json(quoteCart(db, owner));
  }),

  http.delete("/api/cart/coupon", async ({ request }) => {
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    if (db.carts[owner]) delete db.carts[owner].coupon;
    saveDatabase(db);
    return HttpResponse.json(quoteCart(db, owner));
  }),

  http.post("/api/quote", async ({ request }) => {
    const body = (await request.json()) as { network?: NetworkId; accept?: boolean };
    const db = await loadDatabase();
    const owner = ownerId(db, bearer(request), request.headers.get("x-guest-id"));
    if (body.accept) {
      syncCartPrices(db, owner);
      saveDatabase(db);
    }
    return HttpResponse.json(quoteCart(db, owner, body.network ?? "ethereum"));
  }),

  http.post("/api/orders", async ({ request }) => {
    const scenario = scenarioOf(request);
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para concluir a compra.", "unauthorized");
    const body = (await request.json()) as { network?: NetworkId; walletId?: string; quoteVersion?: number };
    const key = request.headers.get("idempotency-key");
    if (!key) return fail(400, "Informe a chave de idempotência.", "validation");
    const wallet = db.wallets.find((item) => item.id === body.walletId && item.userId === user.id);
    if (!wallet) return fail(400, "Selecione uma carteira cadastrada.", "validation", { walletId: "Carteira obrigatória." });
    if (!wallet.connected) return fail(409, "Conecte a carteira antes de confirmar.", "wallet");
    const quote = quoteCart(db, user.id, body.network ?? wallet.network);
    const fingerprint = JSON.stringify({
      lines: quote.lines.map((line) => [line.nftId, line.editionId, line.quantity, line.unitPriceEth]),
      coupon: quote.coupon ?? null,
      network: quote.network,
      walletId: wallet.id,
    });
    const known = db.idempotency[`${user.id}:${key}`];
    if (known) {
      const existing = db.orders.find((order) => order.id === known.orderId);
      if (!existing) return fail(404, "Pedido não encontrado.", "not-found");
      const stored = JSON.parse(known.fingerprint) as { walletId?: string; network?: string };
      const sameAttempt = stored.walletId === wallet.id && stored.network === quote.network;
      if (!sameAttempt || (quote.lines.length > 0 && known.fingerprint !== fingerprint)) {
        return fail(409, "A chave já foi usada em outro pedido.", "idempotency-conflict");
      }
      return HttpResponse.json(existing);
    }
    if (!quote.lines.length) return fail(400, "O carrinho está vazio.", "validation");
    if (quote.warnings.length || quote.version !== body.quoteVersion) {
      return fail(409, "A cotação mudou. Confirme os novos valores.", "stale-quote");
    }
    for (const line of quote.lines) {
      const nft = db.nfts.find((item) => item.id === line.nftId)!;
      const edition = nft.editions.find((item) => item.id === line.editionId)!;
      if (edition.available < line.quantity || nft.priceEth !== line.unitPriceEth) {
        return fail(409, "Preço ou estoque mudou antes da confirmação.", "stale-quote");
      }
    }

    const order: Order = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      status: "pending",
      version: 1,
      items: quote.lines.map((line) => ({
        nftId: line.nftId,
        name: line.name,
        image: line.image,
        editionName: line.editionName,
        quantity: line.quantity,
        unitPriceEth: line.unitPriceEth,
        lineTotalEth: line.lineTotalEth,
      })),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      coupon: quote.coupon,
      network: quote.network,
      walletLabel: wallet.label,
      walletAddress: wallet.address,
      txRef: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      explorerUrl: "https://explorer.kurio.test/tx/simulado",
      idempotencyKey: key,
      fingerprint,
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order);
    db.idempotency[`${user.id}:${key}`] = { fingerprint, orderId: order.id };
    for (const line of quote.lines) {
      const nft = db.nfts.find((item) => item.id === line.nftId)!;
      const edition = nft.editions.find((item) => item.id === line.editionId)!;
      edition.available -= line.quantity;
    }
    saveDatabase(db);

    const resolve = () => {
      if (scenario === "pagamento-recusado") setOrderStatus(db, order.id, "declined");
      else if (scenario !== "pedido-pendente") setOrderStatus(db, order.id, "confirmed");
    };

    if (scenario === "timeout-pedido") {
      resolve();
      await delayOrHang(20000);
    } else {
      window.setTimeout(resolve, scenario === "pedido-pendente" ? 60_000 : 700);
      await scenarioDelay(scenario);
    }
    return HttpResponse.json(order);
  }),

  http.get("/api/orders", async ({ request }) => {
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para ver seus pedidos.", "unauthorized");
    return HttpResponse.json(db.orders.filter((order) => order.userId === user.id));
  }),

  http.get("/api/orders/:id", async ({ params, request }) => {
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Entre para ver o pedido.", "unauthorized");
    const order = db.orders.find((item) => item.id === params.id && item.userId === user.id);
    if (!order) return fail(404, "Pedido não encontrado.", "not-found");
    return HttpResponse.json(order);
  }),

  http.post("/api/dev/orders/:id/resolve", async ({ params, request }) => {
    const body = (await request.json()) as { status?: "confirmed" | "declined" };
    const db = await loadDatabase();
    const order = setOrderStatus(db, String(params.id), body.status ?? "confirmed");
    if (!order) return fail(404, "Pedido não encontrado.", "not-found");
    return HttpResponse.json(order);
  }),

  http.post("/api/dev/nfts/:id/price", async ({ params, request }) => {
    const body = (await request.json()) as { priceEth?: string; available?: number };
    const db = await loadDatabase();
    const event = applyPriceChange(db, String(params.id), body.priceEth ?? "9.99", body.available);
    if (!event) return fail(404, "NFT não encontrado.", "not-found");
    return HttpResponse.json(event);
  }),

  http.get("/api/profile", async ({ request }) => {
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Sessão necessária.", "unauthorized");
    return HttpResponse.json(user);
  }),

  http.patch("/api/profile", async ({ request }) => {
    const body = (await request.json()) as { name?: string; bio?: string; avatar?: string };
    const fields: Record<string, string> = {};
    if (!body.name || body.name.trim().length < 2) fields.name = "Informe seu nome.";
    if ((body.bio?.length ?? 0) > 180) fields.bio = "A bio aceita até 180 caracteres.";
    if (body.avatar && body.avatar.length > 120_000) fields.avatar = "A imagem precisa ser menor.";
    if (Object.keys(fields).length) return fail(400, "Revise os campos.", "validation", fields);
    const db = await loadDatabase();
    const session = sessionUser(db, bearer(request));
    if (!session) return fail(401, "Sessão necessária.", "unauthorized");
    const user = db.users.find((item) => item.id === session.id)!;
    user.name = body.name!.trim();
    user.bio = body.bio?.trim() ?? "";
    if (body.avatar !== undefined) user.avatar = body.avatar;
    saveDatabase(db);
    return HttpResponse.json(publicUser(user));
  }),

  http.post("/api/profile/password", async ({ request }) => {
    const body = (await request.json()) as { currentPassword?: string; nextPassword?: string };
    const fields: Record<string, string> = {};
    if (!body.nextPassword || body.nextPassword.length < 8) fields.nextPassword = "A nova senha precisa de 8 caracteres.";
    const db = await loadDatabase();
    const session = sessionUser(db, bearer(request));
    if (!session) return fail(401, "Sessão necessária.", "unauthorized");
    const user = db.users.find((item) => item.id === session.id)!;
    if (user.passwordHash !== (await sha256(body.currentPassword ?? ""))) {
      fields.currentPassword = "Senha atual incorreta.";
    }
    if (Object.keys(fields).length) return fail(400, "Não foi possível alterar a senha.", "validation", fields);
    user.passwordHash = await sha256(body.nextPassword!);
    saveDatabase(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/wallets", async ({ request }) => {
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Sessão necessária.", "unauthorized");
    return HttpResponse.json(db.wallets.filter((wallet) => wallet.userId === user.id));
  }),

  http.post("/api/wallets", async ({ request }) => {
    const body = (await request.json()) as { id?: string; label?: string; address?: string; network?: NetworkId; primary?: boolean };
    const fields: Record<string, string> = {};
    if (!body.label || body.label.trim().length < 2) fields.label = "Dê um nome à carteira.";
    if (!body.address || body.address.trim().length < 8) fields.address = "Endereço inválido.";
    if (!body.network) fields.network = "Escolha a rede.";
    if (Object.keys(fields).length) return fail(400, "Revise a carteira.", "validation", fields);
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Sessão necessária.", "unauthorized");
    if (body.primary) {
      db.wallets.forEach((wallet) => {
        if (wallet.userId === user.id) wallet.primary = false;
      });
    }
    const existing = db.wallets.find((wallet) => wallet.id === body.id && wallet.userId === user.id);
    if (existing) {
      existing.label = body.label!.trim();
      existing.address = body.address!.trim();
      existing.network = body.network!;
      existing.primary = Boolean(body.primary);
      saveDatabase(db);
      return HttpResponse.json(existing);
    }
    const wallet = {
      id: `wallet-${crypto.randomUUID()}`,
      userId: user.id,
      label: body.label!.trim(),
      address: body.address!.trim(),
      network: body.network!,
      primary: Boolean(body.primary) || db.wallets.every((item) => item.userId !== user.id),
      connected: false,
    };
    db.wallets.push(wallet);
    saveDatabase(db);
    return HttpResponse.json(wallet);
  }),

  http.post("/api/wallets/:id/connection", async ({ params, request }) => {
    const body = (await request.json()) as { action?: "connect" | "refuse" | "disconnect" };
    const db = await loadDatabase();
    const user = sessionUser(db, bearer(request));
    if (!user) return fail(401, "Sessão necessária.", "unauthorized");
    const wallet = db.wallets.find((item) => item.id === params.id && item.userId === user.id);
    if (!wallet) return fail(404, "Carteira não encontrada.", "not-found");
    if (body.action === "refuse") return fail(409, "A carteira recusou a conexão.", "wallet-refused");
    wallet.connected = body.action !== "disconnect";
    saveDatabase(db);
    return HttpResponse.json(wallet);
  }),
];

function delayOrHang(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
