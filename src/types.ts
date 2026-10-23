export type NetworkId = "ethereum" | "polygon" | "solana";

export type CategoryId =
  | "arte-digital"
  | "fotografia"
  | "musica"
  | "arte-3d"
  | "colecionaveis"
  | "generativa"
  | "jogos"
  | "assinaturas"
  | "utilidade";

export type SortId = "recent" | "price-asc" | "price-desc" | "name";
export type CatalogTab = "todos" | "novos" | "alta";
export type OrderStatus = "pending" | "confirmed" | "declined";

export interface Edition {
  id: string;
  name: string;
  available: number;
  total: number;
}

export interface Nft {
  id: string;
  name: string;
  creator: string;
  creatorInitials: string;
  category: CategoryId;
  network: NetworkId;
  priceEth: string;
  previousPriceEth?: string;
  image: string;
  description: string;
  editions: Edition[];
  createdAt: string;
  trending: boolean;
  fresh: boolean;
  version: number;
  contract: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  bio: string;
  avatar?: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  label: string;
  address: string;
  network: NetworkId;
  primary: boolean;
  connected: boolean;
}

export interface CartItem {
  nftId: string;
  editionId: string;
  quantity: number;
  unitPriceEth: string;
  priceVersion: number;
}

export interface Cart {
  ownerId: string;
  items: CartItem[];
  coupon?: string;
}

export interface QuoteLine {
  nftId: string;
  name: string;
  image: string;
  editionId: string;
  editionName: string;
  quantity: number;
  unitPriceEth: string;
  lineTotalEth: string;
  priceVersion: number;
  available: number;
  stale: boolean;
}

export interface Quote {
  quoteId: string;
  version: number;
  lines: QuoteLine[];
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  coupon?: string;
  network: NetworkId;
  warnings: string[];
}

export interface OrderItem {
  nftId: string;
  name: string;
  image: string;
  editionName: string;
  quantity: number;
  unitPriceEth: string;
  lineTotalEth: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  version: number;
  items: OrderItem[];
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  coupon?: string;
  network: NetworkId;
  walletLabel: string;
  walletAddress: string;
  txRef: string;
  explorerUrl: string;
  idempotencyKey: string;
  fingerprint: string;
  createdAt: string;
}

export interface Article {
  id: string;
  dateLabel: string;
  title: string;
  excerpt: string;
  image: string;
}

export interface NftEvent {
  type: "nft.updated";
  nftId: string;
  version: number;
  priceEth: string;
  previousPriceEth?: string;
  editionId?: string;
  available?: number;
}

export interface OrderEvent {
  type: "order.updated";
  orderId: string;
  userId: string;
  version: number;
  status: OrderStatus;
}

export interface ApiErrorBody {
  error: string;
  code: string;
  fields?: Record<string, string>;
}
