import axios, { type AxiosError } from "axios";
import type {
  ApiErrorBody,
  NetworkId,
  Nft,
  Order,
  PublicUser,
  Quote,
  Wallet,
} from "@/types";
import { guestId, readToken } from "@/lib/utils";

export const http = axios.create({
  baseURL: "/api",
  timeout: 8000,
});

http.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-guest-id"] = guestId();
  const scenario = localStorage.getItem("kurio.scenario");
  if (scenario) config.headers["x-scenario"] = scenario;
  return config;
});

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const axiosError = error as AxiosError<ApiErrorBody>;
  if (axiosError.response?.data?.error) {
    return new ApiError(axiosError.response.status, axiosError.response.data);
  }
  if (axiosError.code === "ECONNABORTED") {
    return new ApiError(408, { error: "A requisição expirou.", code: "timeout" });
  }
  return new ApiError(0, { error: "Sem conexão com o marketplace.", code: "offline" });
}

export interface NftQuery {
  q?: string;
  categoria?: string;
  rede?: string;
  min?: string;
  max?: string;
  ordem?: string;
  pagina?: number;
  aba?: string;
}

export interface NftListResponse {
  items: Nft[];
  page: number;
  pageSize: number;
  total: number;
  counts: {
    categories: Record<string, number>;
    networks: Record<string, number>;
  };
}

export const api = {
  listNfts: (params: NftQuery) => http.get<NftListResponse>("/nfts", { params }).then((r) => r.data),
  getNft: (id: string) => http.get<Nft>(`/nfts/${id}`).then((r) => r.data),
  session: () => http.get<PublicUser | null>("/auth/session").then((r) => r.data),
  login: (email: string, password: string) =>
    http.post<{ token: string; user: PublicUser }>("/auth/login", { email, password }).then((r) => r.data),
  register: (input: { name: string; email: string; password: string }) =>
    http.post<{ token: string; user: PublicUser }>("/auth/register", input).then((r) => r.data),
  logout: () => http.post<void>("/auth/logout"),
  favorites: () => http.get<{ ids: string[] }>("/favorites").then((r) => r.data.ids),
  addFavorite: (nftId: string) => http.post<void>(`/favorites/${nftId}`),
  removeFavorite: (nftId: string) => http.delete<void>(`/favorites/${nftId}`),
  cart: () => http.get<Quote>("/cart").then((r) => r.data),
  addCartItem: (input: { nftId: string; editionId: string; quantity: number }) =>
    http.post<Quote>("/cart/items", input).then((r) => r.data),
  updateCartItem: (nftId: string, editionId: string, quantity: number) =>
    http.patch<Quote>(`/cart/items/${nftId}`, { editionId, quantity }).then((r) => r.data),
  removeCartItem: (nftId: string, editionId: string) =>
    http.delete<Quote>(`/cart/items/${nftId}`, { params: { editionId } }).then((r) => r.data),
  applyCoupon: (code: string) => http.post<Quote>("/cart/coupon", { code }).then((r) => r.data),
  removeCoupon: () => http.delete<Quote>("/cart/coupon").then((r) => r.data),
  quote: (network: NetworkId, accept = false) =>
    http.post<Quote>("/quote", { network, accept }).then((r) => r.data),
  createOrder: (input: {
    network: NetworkId;
    walletId: string;
    quoteVersion: number;
    idempotencyKey: string;
  }) =>
    http
      .post<Order>("/orders", input, { headers: { "Idempotency-Key": input.idempotencyKey } })
      .then((r) => r.data),
  getOrder: (id: string) => http.get<Order>(`/orders/${id}`).then((r) => r.data),
  orders: () => http.get<Order[]>("/orders").then((r) => r.data),
  profile: () => http.get<PublicUser>("/profile").then((r) => r.data),
  updateProfile: (input: { name: string; bio: string; avatar?: string }) =>
    http.patch<PublicUser>("/profile", input).then((r) => r.data),
  changePassword: (input: { currentPassword: string; nextPassword: string }) =>
    http.post<void>("/profile/password", input),
  wallets: () => http.get<Wallet[]>("/wallets").then((r) => r.data),
  saveWallet: (input: Omit<Wallet, "id" | "userId" | "connected"> & { id?: string }) =>
    http.post<Wallet>("/wallets", input).then((r) => r.data),
  connectWallet: (id: string, action: "connect" | "refuse" | "disconnect") =>
    http.post<Wallet>(`/wallets/${id}/connection`, { action }).then((r) => r.data),
  resetDemo: () => http.post<void>("/dev/reset"),
  changePrice: (id: string, priceEth: string) => http.post(`/dev/nfts/${id}/price`, { priceEth }),
  resolveOrder: (id: string, status: "confirmed" | "declined") =>
    http.post(`/dev/orders/${id}/resolve`, { status }),
};
