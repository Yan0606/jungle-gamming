import { createCatalog, NETWORKS, sha256 } from "@/mocks/catalog";
import { addEth, compareEth, mulEth, percentEth, subEth } from "@/lib/money";
import type {
  Cart,
  NetworkId,
  Nft,
  NftEvent,
  Order,
  OrderEvent,
  PublicUser,
  Quote,
  Session,
  User,
  Wallet,
} from "@/types";

const STORAGE_KEY = "kurio.db";
const CATALOG_VERSION = 4;

export interface Database {
  catalogVersion?: number;
  nfts: Nft[];
  users: User[];
  sessions: Session[];
  favorites: Record<string, string[]>;
  carts: Record<string, Cart>;
  wallets: Wallet[];
  orders: Order[];
  idempotency: Record<string, { fingerprint: string; orderId: string }>;
}

type Listener = (event: NftEvent | OrderEvent) => void;
const listeners = new Set<Listener>();

export function onRealtime(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRealtime(event: NftEvent | OrderEvent) {
  listeners.forEach((listener) => listener(event));
}

let memory: Database | null = null;

function publicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, bio: user.bio, avatar: user.avatar };
}

export async function resetDatabase() {
  const passwordHash = await sha256("coleciona123");
  const nfts = createCatalog();
  const db: Database = {
    nfts,
    users: [
      {
        id: "user-ana",
        name: "Ana Ribeiro",
        email: "ana@kurio.dev",
        passwordHash,
        bio: "Coleciono edições curtas e retratos digitais.",
      },
      {
        id: "user-bruno",
        name: "Bruno Alves",
        email: "bruno@kurio.dev",
        passwordHash,
        bio: "Acompanho lançamentos e redes com taxa baixa.",
      },
    ],
    sessions: [],
    favorites: { "user-ana": ["sage-nomad-009"], "user-bruno": [] },
    carts: {},
    wallets: [
      {
        id: "wallet-ana-main",
        userId: "user-ana",
        label: "MetaMask",
        address: "0xA11CE0000000000000000000000000000000A11C",
        network: "ethereum",
        primary: true,
        connected: false,
      },
      {
        id: "wallet-ana-sec",
        userId: "user-ana",
        label: "Coinbase Wallet",
        address: "0xB0B00000000000000000000000000000000000B0B",
        network: "polygon",
        primary: false,
        connected: false,
      },
    ],
    orders: [],
    idempotency: {},
    catalogVersion: CATALOG_VERSION,
  };
  memory = db;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

export async function loadDatabase() {
  if (memory) return memory;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const db = JSON.parse(raw) as Database;
    if (db.catalogVersion !== CATALOG_VERSION) {
      db.nfts = createCatalog();
      db.carts = {};
      db.catalogVersion = CATALOG_VERSION;
      for (const wallet of db.wallets) {
        if (wallet.id === "wallet-ana-main") wallet.label = "MetaMask";
        if (wallet.id === "wallet-ana-sec") wallet.label = "Coinbase Wallet";
      }
      saveDatabase(db);
    }
    memory = db;
    return memory;
  }
  return resetDatabase();
}

export function saveDatabase(db: Database) {
  memory = db;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function findUserByEmail(db: Database, email: string) {
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function sessionUser(db: Database, token?: string | null) {
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token && item.expiresAt > Date.now());
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
}

export function ownerId(db: Database, token?: string | null, guest?: string | null) {
  const user = sessionUser(db, token);
  return user?.id ?? guest ?? "guest-anon";
}

function cartFor(db: Database, owner: string): Cart {
  return db.carts[owner] ?? { ownerId: owner, items: [] };
}

export function syncCartPrices(db: Database, owner: string) {
  const cart = db.carts[owner];
  if (!cart) return;
  for (const item of cart.items) {
    const nft = db.nfts.find((entry) => entry.id === item.nftId);
    if (!nft) continue;
    item.unitPriceEth = nft.priceEth;
    item.priceVersion = nft.version;
  }
}

export function quoteCart(db: Database, owner: string, network: NetworkId = "ethereum"): Quote {
  const cart = cartFor(db, owner);
  const warnings: string[] = [];
  const lines = cart.items.flatMap((item) => {
    const nft = db.nfts.find((entry) => entry.id === item.nftId);
    if (!nft) return [];
    const edition = nft.editions.find((entry) => entry.id === item.editionId) ?? nft.editions[0];
    const stale = nft.version !== item.priceVersion || nft.priceEth !== item.unitPriceEth;
    if (stale) warnings.push(`${nft.name} teve o preço ou a disponibilidade atualizados.`);
    if (edition.available < item.quantity) warnings.push(`${nft.name} não tem unidades suficientes na ${edition.name}.`);
    return [
      {
        nftId: nft.id,
        name: nft.name,
        image: nft.image,
        editionId: edition.id,
        editionName: edition.name,
        quantity: item.quantity,
        unitPriceEth: item.unitPriceEth,
        lineTotalEth: mulEth(item.unitPriceEth, item.quantity),
        priceVersion: item.priceVersion,
        available: edition.available,
        stale,
      },
    ];
  });
  const subtotalEth = lines.reduce((sum, line) => addEth(sum, line.lineTotalEth), "0");
  let discountEth = "0";
  if (cart.coupon === "KURIO10") discountEth = percentEth(subtotalEth, 10);
  const networkFeeEth = NETWORKS.find((item) => item.id === network)?.feeEth ?? "0.0042";
  const totalEth = addEth(subEth(subtotalEth, discountEth), lines.length ? networkFeeEth : "0");
  return {
    quoteId: `quote-${owner}`,
    version: lines.reduce((max, line) => Math.max(max, line.priceVersion), 1),
    lines,
    subtotalEth,
    discountEth,
    networkFeeEth: lines.length ? networkFeeEth : "0",
    totalEth,
    coupon: cart.coupon,
    network,
    warnings,
  };
}

export function mergeGuestCart(db: Database, guest: string, userId: string) {
  const guestCart = db.carts[guest];
  if (!guestCart?.items.length) return;
  const userCart = cartFor(db, userId);
  for (const item of guestCart.items) {
    const existing = userCart.items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId);
    if (existing) existing.quantity += item.quantity;
    else userCart.items.push({ ...item });
  }
  db.carts[userId] = userCart;
  delete db.carts[guest];
}

export function applyPriceChange(db: Database, nftId: string, nextPrice: string, available?: number) {
  const nft = db.nfts.find((item) => item.id === nftId);
  if (!nft) return null;
  nft.previousPriceEth = nft.priceEth;
  nft.priceEth = nextPrice;
  nft.version += 1;
  if (typeof available === "number") {
    const edition = nft.editions[0];
    edition.available = available;
  }
  const event: NftEvent = {
    type: "nft.updated",
    nftId: nft.id,
    version: nft.version,
    priceEth: nft.priceEth,
    previousPriceEth: nft.previousPriceEth,
    editionId: nft.editions[0]?.id,
    available: nft.editions[0]?.available,
  };
  emitRealtime(event);
  saveDatabase(db);
  return event;
}

export function setOrderStatus(db: Database, orderId: string, status: Order["status"]) {
  const order = db.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "pending") return order ?? null;
  order.status = status;
  order.version += 1;
  if (status === "confirmed") {
    const cart = db.carts[order.userId];
    if (cart) {
      for (const bought of order.items) {
        const item = cart.items.find((entry) => entry.nftId === bought.nftId);
        if (!item) continue;
        item.quantity -= bought.quantity;
      }
      cart.items = cart.items.filter((item) => item.quantity > 0);
      cart.coupon = undefined;
    }
  }
  if (status === "declined") {
    for (const bought of order.items) {
      const nft = db.nfts.find((item) => item.id === bought.nftId);
      const edition = nft?.editions.find((item) => item.name === bought.editionName);
      if (edition) edition.available += bought.quantity;
    }
  }
  const event: OrderEvent = {
    type: "order.updated",
    orderId: order.id,
    userId: order.userId,
    version: order.version,
    status: order.status,
  };
  emitRealtime(event);
  saveDatabase(db);
  return order;
}

export function pricesMatch(left: string, right: string) {
  return compareEth(left, right) === 0;
}

export { publicUser };
