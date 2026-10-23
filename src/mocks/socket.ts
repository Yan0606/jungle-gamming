import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { loadDatabase, onRealtime, sessionUser } from "@/mocks/db";

const link = ws.link(/socket\.io/i);

export const socketHandlers = [
  link.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection);
    const { client } = connection;
    let userId: string | null = null;
    const stop = onRealtime((event) => {
      if (event.type === "order.updated" && event.userId !== userId) return;
      io.client.emit(event.type, event);
    });

    io.client.on("identify", async (_event, payload: { token?: string | null }) => {
      const db = await loadDatabase();
      userId = sessionUser(db, payload?.token)?.id ?? null;
      io.client.emit("ready", { ok: true });
    });

    client.addEventListener("close", () => stop());
  }),
];
