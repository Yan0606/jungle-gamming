import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import type { Nft, NftEvent, Order, OrderEvent } from "@/types";
import { readToken } from "@/lib/utils";

const versions = new Map<string, number>();

function isFresh(key: string, version: number) {
  const current = versions.get(key) ?? 0;
  if (version <= current) return false;
  versions.set(key, version);
  return true;
}

let socket: Socket | null = null;

export function connectRealtime(queryClient: QueryClient) {
  if (!socket) {
    socket = io({
      transports: ["websocket"],
      reconnection: true,
      autoConnect: false,
    });
    socket.on("nft.updated", (event: NftEvent) => {
      if (!isFresh(`nft:${event.nftId}`, event.version)) return;
      queryClient.setQueriesData<Nft>({ queryKey: ["nft"] }, (current) => {
        if (!current || current.id !== event.nftId) return current;
        return {
          ...current,
          priceEth: event.priceEth,
          previousPriceEth: event.previousPriceEth,
          version: event.version,
          editions: current.editions.map((edition) =>
            edition.id === event.editionId && typeof event.available === "number"
              ? { ...edition, available: event.available }
              : edition,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    });
    socket.on("order.updated", (event: OrderEvent) => {
      if (!isFresh(`order:${event.orderId}`, event.version)) return;
      queryClient.setQueryData<Order>(["order", event.orderId], (current) =>
        current ? { ...current, status: event.status, version: event.version } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    });
    socket.on("connect", () => {
      socket?.emit("identify", { token: readToken() });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
}
