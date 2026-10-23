import { HttpResponse, delay } from "msw";
import type { ApiErrorBody } from "@/types";

export function fail(status: number, error: string, code: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = { error, code, fields };
  return HttpResponse.json(body, { status });
}

export async function scenarioDelay(scenario: string | null) {
  if (scenario === "lento") await delay(1400);
  else if (scenario === "latencia-variavel") await delay(150 + Math.round(Math.random() * 900));
  else if (scenario === "fora-de-ordem") await delay(Math.random() > 0.5 ? 80 : 1100);
  else await delay(120);
}

export function scenarioOf(request: Request) {
  return request.headers.get("x-scenario");
}

export function bearer(request: Request) {
  const value = request.headers.get("authorization");
  return value?.replace(/^Bearer\s+/i, "") ?? null;
}
