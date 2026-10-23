import { setupWorker } from "msw/browser";
import { handlers } from "@/mocks/handlers";
import { socketHandlers } from "@/mocks/socket";

export const worker = setupWorker(...handlers, ...socketHandlers);
