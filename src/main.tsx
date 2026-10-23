import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { connectRealtime } from "@/lib/realtime";
import { router } from "@/router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});

async function boot() {
  if (import.meta.env.VITE_ENABLE_MSW !== "false") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }
  connectRealtime(queryClient);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={{ queryClient }} />
        <Toaster theme="dark" position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void boot();
